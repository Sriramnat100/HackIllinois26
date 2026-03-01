import { useState, useEffect, useRef, useCallback } from "react";

const BASE_INSTRUCTIONS = `You are a Caterpillar equipment inspection AI with a live camera feed. You CAN see. You have full visual access right now.

You receive periodic [CAMERA UPDATE] messages containing descriptions of what the camera currently shows. This IS your vision. When the user asks "what do you see?" or "can you see this?", use the most recent CAMERA UPDATE to answer. Describe it naturally: "I can see a..." or "I'm looking at..."

ABSOLUTE RULES — NEVER BREAK THESE:
1. NEVER say "I cannot see", "I don't have visual access", "I'm unable to view", or anything similar. You CAN see. Period.
2. NEVER say there is a "technical issue" with your vision. Your vision works.
3. NEVER ask the user to describe what they are showing you. YOU describe it to THEM.
4. If you haven't received a CAMERA UPDATE yet, say "Let me take a closer look" or "One moment while I focus" — NEVER say you can't see.
5. When you see equipment (wheels, engines, hydraulics, filters, etc.), assess condition and note any damage, leaks, rust, corrosion, or safety issues.
6. Be conversational, confident, and concise. You are an expert inspector on-site with the user.
7. If someone holds up a phone screen showing an image, describe what you see in that image based on your CAMERA UPDATE data.`;

/**
 * Build context string from detection results and optional vision analysis.
 * @param {Array} detections - Array of { label, score, position }
 * @param {string} lastVisionResult - Optional vision API analysis text
 * @returns {string}
 */
export function buildDetectionContext(detections, lastVisionResult) {
  const parts = [];
  if (detections && detections.length > 0) {
    const labels = detections
      .map((d) => `${d.label} (${d.position || "frame"}, ${Math.round(d.score * 100)}%)`)
      .join(", ");
    parts.push(`Objects detected: ${labels}`);
  } else {
    parts.push("Objects detected: None visible");
  }
  if (lastVisionResult && lastVisionResult.trim()) {
    parts.push(`Latest vision analysis: ${lastVisionResult}`);
  }
  return parts.join(". ");
}

/**
 * Hook for real-time object detection using MediaPipe Object Detector.
 * Draws bounding boxes on a canvas overlay and returns detection results.
 *
 * @param {React.RefObject} videoRef - Ref to the video element
 * @param {React.RefObject} canvasRef - Ref to the overlay canvas for drawing boxes
 * @param {boolean} enabled - Whether detection is active
 * @param {number} scoreThreshold - Minimum confidence (0-1)
 * @returns {{ detections: Array, isReady: boolean, error: string | null }}
 */
export function useObjectDetection(videoRef, canvasRef, enabled, scoreThreshold = 0.5) {
  const [detections, setDetections] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const lastRunRef = useRef(0);

  // Load MediaPipe model
  useEffect(() => {
    let mounted = true;

    async function initDetector() {
      try {
        const { FilesetResolver, ObjectDetector } = await import("@mediapipe/tasks-vision");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const detector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite",
          },
          scoreThreshold: scoreThreshold,
          runningMode: "VIDEO",
        });

        if (mounted) {
          detectorRef.current = detector;
          setIsReady(true);
          setError(null);
        }
      } catch (err) {
        console.error("Object detection init error:", err);
        if (mounted) {
          setError(err.message || "Failed to load object detection model");
          setIsReady(false);
        }
      }
    }

    initDetector();
    return () => {
      mounted = false;
      detectorRef.current = null;
    };
  }, [scoreThreshold]);

  // Map detection to position (center, left, right, top, bottom)
  const getPosition = useCallback((bbox, videoWidth, videoHeight) => {
    if (!bbox) return "frame";
    const cx = bbox.originX + bbox.width / 2;
    const cy = bbox.originY + bbox.height / 2;
    const hThird = videoWidth / 3;
    const vThird = videoHeight / 3;
    const horiz = cx < hThird ? "left" : cx > videoWidth - hThird ? "right" : "center";
    const vert = cy < vThird ? "top" : cy > videoHeight - vThird ? "bottom" : "center";
    if (horiz === "center" && vert === "center") return "center";
    return `${horiz} ${vert}`;
  }, []);

  // Draw boxes on canvas
  const drawDetections = useCallback(
    (ctx, dets, videoWidth, videoHeight) => {
      ctx.clearRect(0, 0, videoWidth, videoHeight);

      if (!dets || dets.length === 0) return;

      dets.forEach((d) => {
        const bbox = d.boundingBox;
        if (!bbox) return;

        const x = bbox.originX;
        const y = bbox.originY;
        const w = bbox.width;
        const h = bbox.height;

        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        // crisp corner ticks for command-center feel
        const tick = 10;
        ctx.beginPath();
        ctx.moveTo(x, y + tick);
        ctx.lineTo(x, y);
        ctx.lineTo(x + tick, y);
        ctx.moveTo(x + w - tick, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + tick);
        ctx.moveTo(x, y + h - tick);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + tick, y + h);
        ctx.moveTo(x + w - tick, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y + h - tick);
        ctx.stroke();

        const label = d.categories?.[0]?.categoryName || "object";
        const score = d.categories?.[0]?.score ?? 0;

        ctx.fillStyle = "rgba(16, 185, 129, 0.92)";
        ctx.font = "600 12px Inter, system-ui, sans-serif";
        ctx.textBaseline = "top";
        const text = `${label} ${Math.round(score * 100)}%`;
        const metrics = ctx.measureText(text);
        const tw = metrics.width + 14;
        const th = 20;
        ctx.beginPath();
        ctx.roundRect(x, y - th - 3, tw, th, 3);
        ctx.fill();
        ctx.fillStyle = "#04120c";
        ctx.fillText(text, x + 7, y - th + 2);
      });
    },
    []
  );

  // Detection loop
  useEffect(() => {
    if (!enabled || !isReady || !detectorRef.current || !videoRef?.current || !canvasRef?.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const runDetection = () => {
      if (video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(runDetection);
        return;
      }

      const now = performance.now();
      const elapsed = now - lastRunRef.current;
      if (elapsed < 100) {
        rafRef.current = requestAnimationFrame(runDetection);
        return;
      }
      lastRunRef.current = now;

      try {
        const result = detectorRef.current.detectForVideo(video, now);
        const dets = result?.detections || [];

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        canvas.width = vw;
        canvas.height = vh;
        drawDetections(ctx, dets, vw, vh);

        const mapped = dets.map((d) => {
          const cat = d.categories?.[0];
          const label = cat?.categoryName || "object";
          const score = cat?.score ?? 0;
          const position = getPosition(d.boundingBox, vw, vh);
          return { label, score, position, boundingBox: d.boundingBox };
        });

        setDetections(mapped);
      } catch (err) {
        console.error("Detection run error:", err);
      }

      rafRef.current = requestAnimationFrame(runDetection);
    };

    rafRef.current = requestAnimationFrame(runDetection);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [enabled, isReady, videoRef, canvasRef, drawDetections, getPosition]);

  return { detections, isReady, error };
}

export { BASE_INSTRUCTIONS };
