"""
WebRTC camera link for live inspections.

The browser sends its camera as a WebRTC video track (plus an "inspection" data channel)
to the backend. The backend keeps the latest frame, analyzes one every few seconds with
OpenAI Vision, and pushes the findings back over the data channel. The inspector can also
send {"type": "capture"} on the data channel to analyze the current frame right away.
"""
import asyncio
import base64
import fractions
import json
import logging
from typing import Awaitable, Callable, Optional

import av
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.mediastreams import MediaStreamError

logger = logging.getLogger(__name__)

# analyze(jpeg_base64) -> normalized result dict (raises on failure)
AnalyzeFn = Callable[[str], Awaitable[dict]]
# record(result, source, snapshot_base64) -> stored observation dict
RecordFn = Callable[[dict, str, Optional[str]], dict]


def frame_to_jpeg_base64(frame: av.VideoFrame, max_width: int, quality: int) -> str:
    """Encode a video frame as JPEG with PyAV's mjpeg encoder (lower quality value = better)."""
    width = min(max_width, frame.width) // 2 * 2
    height = int(frame.height * width / frame.width) // 2 * 2
    scaled = frame.reformat(width=width, height=height, format="yuvj420p")
    codec = av.CodecContext.create("mjpeg", "w")
    codec.width, codec.height, codec.pix_fmt = width, height, "yuvj420p"
    codec.time_base = fractions.Fraction(1, 30)
    codec.options = {"qmin": str(quality), "qmax": str(quality)}
    data = b"".join(bytes(p) for p in codec.encode(scaled)) + b"".join(bytes(p) for p in codec.encode(None))
    return base64.b64encode(data).decode("ascii")


class CameraSession:
    def __init__(self, inspection_id: str, analyze: AnalyzeFn, record: RecordFn, interval_seconds: float = 5.0):
        self.inspection_id = inspection_id
        self.analyze = analyze
        self.record = record
        self.interval = interval_seconds
        self.pc = RTCPeerConnection()
        self.channel = None
        self.latest_frame: Optional[av.VideoFrame] = None
        self.paused = False
        self.frames_analyzed = 0
        self._busy = asyncio.Lock()
        self._tasks: list[asyncio.Task] = []
        self.on_closed: Optional[Callable[[], None]] = None

        @self.pc.on("datachannel")
        def on_datachannel(channel):
            self.channel = channel

            @channel.on("message")
            def on_message(message):
                self._handle_message(message)

        @self.pc.on("track")
        def on_track(track):
            if track.kind == "video":
                self._tasks.append(asyncio.ensure_future(self._read_frames(track)))

        @self.pc.on("connectionstatechange")
        async def on_state():
            logger.info(f"Camera link {self.inspection_id}: {self.pc.connectionState}")
            if self.pc.connectionState in ("failed", "closed"):
                await self.close()

    async def accept_offer(self, sdp: str, type_: str) -> dict:
        await self.pc.setRemoteDescription(RTCSessionDescription(sdp=sdp, type=type_))
        await self.pc.setLocalDescription(await self.pc.createAnswer())
        self._tasks.append(asyncio.ensure_future(self._analysis_loop()))
        return {"sdp": self.pc.localDescription.sdp, "type": self.pc.localDescription.type}

    async def _read_frames(self, track):
        try:
            while True:
                self.latest_frame = await track.recv()
        except MediaStreamError:
            pass

    async def _analysis_loop(self):
        while True:
            await asyncio.sleep(self.interval)
            if not self.paused and self.latest_frame is not None and not self._busy.locked():
                await self.analyze_latest("webrtc")

    def _handle_message(self, message):
        try:
            msg = json.loads(message)
        except (TypeError, ValueError):
            return
        kind = msg.get("type")
        if kind == "capture":
            asyncio.ensure_future(self.analyze_latest("capture"))
        elif kind == "pause":
            self.paused = True
        elif kind == "resume":
            self.paused = False

    async def analyze_latest(self, source: str) -> Optional[dict]:
        """Analyze the most recent frame and push the result to the browser."""
        frame = self.latest_frame
        if frame is None:
            self.send({"type": "error", "message": "No camera frames received yet."})
            return None
        async with self._busy:
            self.send({"type": "status", "state": "analyzing", "source": source})
            image = frame_to_jpeg_base64(frame, max_width=1024, quality=3)
            snapshot = frame_to_jpeg_base64(frame, max_width=480, quality=6)
            try:
                result = await self.analyze(image)
            except Exception as e:
                self.send({"type": "error", "source": source, "message": f"Vision analysis failed: {e}"})
                return None
            self.frames_analyzed += 1
            # Keep a picture as evidence when something was found or the inspector asked for it
            keep = source == "capture" or any(f["severity"] != "LOW" for f in result.get("findings", []))
            obs = self.record(result, source, snapshot if keep else None)
            self.send({"type": "analysis", "source": source, "observation_id": obs["id"],
                       "timestamp": obs["timestamp"], "result": result, "snapshot": snapshot})
            return result

    def send(self, payload: dict):
        if self.channel is not None and self.channel.readyState == "open":
            self.channel.send(json.dumps(payload))

    async def close(self):
        for task in self._tasks:
            task.cancel()
        self._tasks = []
        if self.pc.connectionState != "closed":
            await self.pc.close()
        if self.on_closed:
            self.on_closed()
            self.on_closed = None
