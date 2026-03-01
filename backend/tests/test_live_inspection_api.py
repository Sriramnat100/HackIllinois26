"""API + WebRTC tests for the live inspection workflow. OpenAI is stubbed; no network calls."""
import asyncio
import base64
import fractions
import json
import os
import sys

import av
import httpx
import numpy as np
import pytest
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402
from camera_rtc import frame_to_jpeg_base64  # noqa: E402
from inspection_ai import VisionAnalysisError, normalize_analysis  # noqa: E402

LEAK = normalize_analysis({
    "image_quality": "good", "equipment": "excavator boom", "summary": "Hydraulic oil leaking at boom cylinder.",
    "overall_severity": "HIGH", "recommended_decision": "FAIL", "spoken_response": "Stop, hydraulic leak.",
    "findings": [{"component": "Boom cylinder", "issue": "Active hydraulic leak", "severity": "HIGH",
                  "safety_risk": True, "recommended_action": "Tag out and replace rod seal", "confidence": 0.92}],
})


@pytest.fixture(autouse=True)
def stub_openai(monkeypatch):
    calls = []

    async def fake_analyze(client, model, image_base64, context=None):
        calls.append(image_base64)
        assert base64.b64decode(image_base64)[:2] == b"\xff\xd8"  # a real JPEG
        return LEAK

    async def fake_summary(client, model, inspection, report):
        return "AI summary: do not operate until the boom cylinder leak is fixed."

    monkeypatch.setattr(server, "get_openai_client", lambda: object())
    monkeypatch.setattr(server, "analyze_image", fake_analyze)
    monkeypatch.setattr(server, "write_summary", fake_summary)
    monkeypatch.setattr(server, "VISION_INTERVAL_SECONDS", 0.3)
    return calls


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=server.app), base_url="http://test")


async def create_inspection(http):
    res = await http.post("/api/inspections", json={
        "equipment_model": "CAT 320 Excavator", "serial_number": "SN320", "customer": "ACME",
        "location": "Peoria, IL", "inspection_type": "Safety"})
    assert res.status_code == 200
    return res.json()


def jpeg_b64():
    img = np.full((240, 320, 3), 90, np.uint8)
    return frame_to_jpeg_base64(av.VideoFrame.from_ndarray(img, format="rgb24"), 320, 4)


def test_new_inspection_starts_without_mock_findings():
    async def run():
        async with client() as http:
            insp = await create_inspection(http)
            assert insp["findings"] == [] and insp["checklist"] == [] and insp["parts_matches"] == []
    asyncio.run(run())


def test_photo_analysis_feeds_the_report():
    async def run():
        async with client() as http:
            insp = await create_inspection(http)
            res = await http.post("/api/ai/vision/analyze", json={"image_base64": jpeg_b64(), "inspection_id": insp["id"]})
            assert res.status_code == 200 and res.json()["severity"] == "HIGH"

            done = await http.post(f"/api/inspections/{insp['id']}/finish",
                                   json={"notes": ["Leak near pin"], "manual_marks": []})
            assert done.json()["report_generated"] is True and done.json()["status"] == "FAIL"

            report = (await http.get(f"/api/inspections/{insp['id']}")).json()
            assert report["status"] == "FAIL"
            assert report["summary"].startswith("AI summary")
            assert report["action_items"][0]["action"] == "Tag out and replace rod seal"
            assert report["safety_findings"] == ["Boom cylinder: Active hydraulic leak (HIGH)"]
            assert report["checklist"][0]["result"] == "FAIL"
            assert len(report["media"]) == 1
    asyncio.run(run())


def test_vision_failure_is_an_error_not_a_fake_result(monkeypatch):
    async def broken(*args, **kwargs):
        raise VisionAnalysisError("rate limited")
    monkeypatch.setattr(server, "analyze_image", broken)

    async def run():
        async with client() as http:
            res = await http.post("/api/ai/vision/analyze", json={"image_base64": jpeg_b64()})
            assert res.status_code == 502
            assert "rate limited" in res.json()["detail"]
    asyncio.run(run())


def test_finish_without_any_analysis():
    async def run():
        async with client() as http:
            insp = await create_inspection(http)
            done = (await http.post(f"/api/inspections/{insp['id']}/finish")).json()
            assert done["status"] == "Submitted" and done["frames_analyzed"] == 0
            report = (await http.get(f"/api/inspections/{insp['id']}")).json()
            assert not report["summary"].startswith("AI summary")  # no AI summary without real data
            assert "No usable inspection media" in report["summary"]
    asyncio.run(run())


class PatternTrack(VideoStreamTrack):
    """Synthetic camera: a moving gradient, 320x240."""

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        img = np.zeros((240, 320, 3), np.uint8)
        img[:, :, 0] = (np.arange(320) + pts // 3000) % 255
        frame = av.VideoFrame.from_ndarray(img, format="rgb24")
        frame.pts, frame.time_base = pts, time_base
        return frame


def test_webrtc_camera_link_end_to_end(stub_openai):
    """Browser-side peer (aiortc) streams video to /camera/offer and gets findings on the data channel."""
    async def run():
        async with client() as http:
            insp = await create_inspection(http)
            pc = RTCPeerConnection()
            pc.addTrack(PatternTrack())
            channel = pc.createDataChannel("inspection")
            messages = asyncio.Queue()
            channel.on("message", lambda m: messages.put_nowait(json.loads(m)))
            opened = asyncio.Event()
            channel.on("open", opened.set)

            await pc.setLocalDescription(await pc.createOffer())
            res = await http.post(f"/api/inspections/{insp['id']}/camera/offer",
                                  json={"sdp": pc.localDescription.sdp, "type": pc.localDescription.type})
            assert res.status_code == 200
            await pc.setRemoteDescription(RTCSessionDescription(**res.json()))
            await asyncio.wait_for(opened.wait(), 10)

            # Automatic analysis of the live feed
            auto = await asyncio.wait_for(_next_analysis(messages), 15)
            assert auto["source"] == "webrtc"
            assert auto["result"]["severity"] == "HIGH"
            assert base64.b64decode(auto["snapshot"])[:2] == b"\xff\xd8"

            # Manual capture over the data channel
            channel.send(json.dumps({"type": "capture"}))
            manual = await asyncio.wait_for(_next_analysis(messages, source="capture"), 15)
            assert manual["result"]["findings"][0]["component"] == "Boom cylinder"

            done = (await http.post(f"/api/inspections/{insp['id']}/finish")).json()
            assert done["status"] == "FAIL" and done["frames_analyzed"] >= 2
            assert insp["id"] not in server.CAMERA_SESSIONS  # finishing closes the camera link
            assert len(stub_openai) >= 2
            await pc.close()
    asyncio.run(run())


async def _next_analysis(queue, source=None):
    while True:
        msg = await queue.get()
        if msg["type"] == "analysis" and (source is None or msg["source"] == source):
            return msg
