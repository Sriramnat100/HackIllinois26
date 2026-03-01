import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LiveFindingsTimeline } from "@/components/LiveFindingsTimeline";
import {
  Video,
  VideoOff,
  Camera,
  Mic,
  MicOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Square,
  Truck,
  Clock,
  Volume2,
  VolumeX,
  Brain,
  Phone,
  PhoneOff,
  Eye,
  EyeOff,
  Scan,
} from "lucide-react";
import { useObjectDetection, buildDetectionContext, BASE_INSTRUCTIONS } from "@/hooks/useObjectDetection";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axios from "axios";

import { API_URL } from "@/lib/api";

const REPORT_STAGES = [
  "Analyzing footage",
  "Classifying findings",
  "Matching parts",
  "Generating summary",
  "Finalizing report",
];

const INSIGHT_DEDUPE_MS = 25000;
const CANDIDATE_STALE_MS = 12000;
const HIGH_IMMEDIATE_CONFIDENCE = 65;
const MEDIUM_MIN_CONFIDENCE = 78;
const NON_PASS_MIN_CONFIDENCE = 75;
const REQUIRED_CONFIRMATIONS = 2;
import { API_URL } from "@/config";

export default function LiveInspection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioElementRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [findings, setFindings] = useState([]);
  const [cameraError, setCameraError] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [lastTranscript, setLastTranscript] = useState("");
  const [aiStatus, setAiStatus] = useState("idle"); // idle, listening, thinking, speaking, analyzing
  const [visionEnabled, setVisionEnabled] = useState(false); // Auto vision analysis
  const [lastVisionResult, setLastVisionResult] = useState("");
  const [detectionEnabled, setDetectionEnabled] = useState(false); // Object detection + boxes
  const [reportStage, setReportStage] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [inspectorNotes, setInspectorNotes] = useState([]);
  const [inspectionInsights, setInspectionInsights] = useState([]);
  const visionIntervalRef = useRef(null);
  const contextUpdateIntervalRef = useRef(null);
  const detectionsRef = useRef([]);
  const lastVisionResultRef = useRef("");
  const visionItemIdRef = useRef(null);
  const initialInsightCapturedRef = useRef(false);
  const pendingCandidatesRef = useRef(new Map());
  const lastLoggedByFingerprintRef = useRef(new Map());

  // Object detection (MediaPipe) - draws boxes, provides labels for AI context
  const { detections } = useObjectDetection(
    videoRef,
    detectionCanvasRef,
    detectionEnabled,
    0.5
  );

  // Keep refs in sync for context injection
  detectionsRef.current = detections;
  lastVisionResultRef.current = lastVisionResult;

  // Capture frame from video at high quality for vision analysis
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return dataUrl.split(',')[1];
  }, []);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 1280, height: 720 },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError("Unable to access camera. Please grant permission.");
      }
    };

    startCamera();

    return () => {
      disconnectRealtime();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Get ephemeral token from backend
  const getEphemeralToken = async () => {
    try {
      const response = await axios.post(`${API_URL}/ai/realtime/session`);
      console.log("Ephemeral token response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to get ephemeral token:", error);
      const errorMsg = error.response?.data?.detail || error.message || "Unknown error getting session";
      throw new Error(`Session error: ${errorMsg}`);
    }
  };

  // Connect to OpenAI Realtime API via WebRTC
  const connectRealtime = async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    toast.info("Connecting to AI...");

    try {
      // Get ephemeral session from backend
      const sessionData = await getEphemeralToken();
      console.log("Session data:", sessionData);
      
      const ephemeralKey = sessionData.client_secret?.value;
      if (!ephemeralKey) {
        throw new Error("Failed to get ephemeral key from session");
      }
      
      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Set up audio element for AI responses
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioElementRef.current = audioEl;
      
      pc.ontrack = (e) => {
        console.log("Received audio track from AI");
        audioEl.srcObject = e.streams[0];
      };

      pc.onconnectionstatechange = () => {
        console.log("WebRTC connection state:", pc.connectionState);
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          console.warn("WebRTC connection lost");
          toast.warning("AI connection interrupted. Try reconnecting.");
          setIsConnected(false);
          setAiStatus("idle");
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
      };

      // Add local audio track (microphone)
      if (streamRef.current) {
        const audioTrack = streamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          pc.addTrack(audioTrack, streamRef.current);
          console.log("Added local audio track");
        }
      }

      // Set up data channel for events
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        console.log("Data channel opened");
        setAiStatus("listening");
        
        // Configure session for equipment inspection (context injected periodically)
        const sessionConfig = {
          type: "session.update",
          session: {
            type: "realtime",
            instructions: BASE_INSTRUCTIONS,
            audio: {
              input: {
                transcription: { model: "whisper-1" },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500
                }
              },
              output: { voice: "alloy" },
            },
          }
        };
        dc.send(JSON.stringify(sessionConfig));
      };

      dc.onmessage = (e) => {
        handleRealtimeEvent(JSON.parse(e.data));
      };

      dc.onerror = (e) => {
        console.error("Data channel error:", e);
        toast.error("Data channel error");
      };

      dc.onclose = () => {
        console.log("Data channel closed");
      };

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Connect directly to OpenAI Realtime API using ephemeral key
      const sdpResponse = await axios.post(
        "https://api.openai.com/v1/realtime/calls",
        offer.sdp,
        {
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
          responseType: "text",
          transformResponse: [(data) => data],
        }
      );

      await pc.setRemoteDescription({ type: "answer", sdp: sdpResponse.data });
      
      setIsConnected(true);
      setIsConnecting(false);
      toast.success("Connected to AI Inspector");
      console.log("WebRTC connection established");

      // Auto-enable vision so the AI can "see" immediately
      setTimeout(() => startVisionAnalysis(), 1500);

    } catch (error) {
      console.error("Connection error:", error);
      setIsConnecting(false);
      setIsConnected(false);
      
      // Clean up any partial connection
      if (dataChannelRef.current) {
        try { dataChannelRef.current.close(); } catch (e) {}
        dataChannelRef.current = null;
      }
      if (peerConnectionRef.current) {
        try { peerConnectionRef.current.close(); } catch (e) {}
        peerConnectionRef.current = null;
      }
      
      const errorMsg = error.response?.data?.detail || error.message || "Unknown connection error";
      toast.error("Failed to connect to AI: " + errorMsg);
    }
  };

  // Handle events from Realtime API
  const handleRealtimeEvent = (event) => {
    console.log("Realtime event:", event.type, event);

    switch (event.type) {
      case "session.created":
        console.log("Session created");
        setAiStatus("listening");
        break;

      case "session.updated":
        console.log("Session updated");
        break;

      case "input_audio_buffer.speech_started":
        setAiStatus("listening");
        break;

      case "input_audio_buffer.speech_stopped":
        setAiStatus("thinking");
        break;

      case "conversation.item.input_audio_transcription.completed":
        // User's speech transcribed
        if (event.transcript) {
          setLastTranscript(event.transcript);
          toast.info(`You: "${event.transcript}"`);
        }
        break;

      case "response.audio_transcript.delta":
      case "response.output_audio_transcript.delta":
        // AI is speaking - partial transcript
        setAiStatus("speaking");
        break;

      case "response.audio.done":
      case "response.output_audio.done":
        setAiStatus("listening");
        break;

      case "response.done":
        setAiStatus("listening");
        // Check if response contains findings
        if (event.response?.output) {
          processAIResponse(event.response.output);
        }
        break;

      case "response.text.done":
      case "response.output_text.done":
        // Text response completed
        if (event.text) {
          processTextForFindings(event.text);
        }
        break;

      case "error":
        console.error("Realtime API error:", event.error);
        toast.error("AI Error: " + (event.error?.message || "Unknown error"));
        break;

      default:
        // Log other events for debugging
        if (event.type.includes("error")) {
          console.error("Error event:", event);
        }
    }
  };

  // Process AI response for findings
  const processAIResponse = (output) => {
    output.forEach((item) => {
      if (item.type === "message" && item.content) {
        item.content.forEach((content) => {
          if (content.type === "output_text" || content.type === "text") {
            processTextForFindings(content.text);
          }
        });
      }
    });
  };

  // Extract findings from AI text
  const processTextForFindings = (text) => {
    if (!text) return;

    // Look for severity indicators in AI response
    const severityPatterns = [
      { pattern: /HIGH|CRITICAL|SAFETY|DANGER|URGENT/gi, severity: "HIGH" },
      { pattern: /MEDIUM|ATTENTION|MONITOR|CAUTION/gi, severity: "MEDIUM" },
      { pattern: /LOW|MINOR|NOTE/gi, severity: "LOW" },
    ];

    let detectedSeverity = null;
    for (const { pattern, severity } of severityPatterns) {
      if (pattern.test(text)) {
        detectedSeverity = severity;
        break;
      }
    }

    // If severity detected, create a finding
    if (detectedSeverity) {
      const newFinding = {
        id: `f-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        severity: detectedSeverity,
        title: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
        recommendation: text.substring(0, 150),
        confidence: 0.9,
        category: "AI Detection"
      };

      setFindings(prev => [newFinding, ...prev].slice(0, 20));

      if (detectedSeverity === "HIGH") {
        toast.error(`Safety Alert Detected!`, {
          description: text.substring(0, 100),
        });
      }
    }
  };

  // Send image to AI for analysis (manual capture)
  const sendImageToAI = async () => {
    const imageBase64 = captureFrame();
    if (!imageBase64) {
      toast.error("No camera feed available");
      return;
    }

    // Save photo
    try {
      await axios.post(`${API_URL}/inspections/${id}/media`, {
        inspection_id: id,
        media_type: "photo",
        data_base64: imageBase64,
        caption: "Captured during inspection",
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error("Failed to save photo:", error);
    }

    // Analyze with GPT-4o Vision API
    await analyzeFrameWithVision(imageBase64, true);
    toast.success("Photo captured and analyzed");
  };

  // Analyze a frame using GPT-4o Vision API
  const analyzeFrameWithVision = async (imageBase64, speakResult = false) => {
    try {
      setAiStatus("analyzing");
      
      const response = await axios.post(`${API_URL}/ai/vision/analyze`, {
        image_base64: imageBase64,
        context: "equipment inspection"
      });

      const result = response.data;
      setLastVisionResult(result.spoken_response || result.analysis);

      // Build an insight card entry for right-rail history
      const findingsList = Array.isArray(result.findings) ? result.findings : [];
      const normalizedBackendSeverity = String(result.severity || result.overall_severity || "").toUpperCase();
      let severityRecommendation =
        normalizedBackendSeverity === "HIGH" || normalizedBackendSeverity === "MEDIUM" || normalizedBackendSeverity === "LOW"
          ? normalizedBackendSeverity
          : null;

      if (!severityRecommendation) {
        severityRecommendation = findingsList.some((f) => (f.severity || "").toUpperCase() === "HIGH") || result.should_alert
          ? "HIGH"
          : findingsList.some((f) => (f.severity || "").toUpperCase() === "MEDIUM")
          ? "MEDIUM"
          : "LOW";
      }

      const backendDecision = String(result.recommended_decision || "").toUpperCase();
      const recommendedDecision =
        backendDecision === "PASS" || backendDecision === "FAIL" || backendDecision === "FURTHER INSPECTION"
          ? backendDecision
          : severityRecommendation === "HIGH"
          ? "FAIL"
          : severityRecommendation === "MEDIUM"
          ? "FURTHER INSPECTION"
          : "PASS";

      const insightCategory =
        findingsList[0]?.issue ||
        findingsList[0]?.category ||
        (result.analysis ? "Visual inspection" : "Scene check");

      const rawConfidence = Number(findingsList[0]?.confidence);
      const confidencePercent = Number.isFinite(rawConfidence)
        ? Math.round(Math.max(0, Math.min(1, rawConfidence)) * 100)
        : 89;

      const normalizedCategory = String(insightCategory || "visual-check")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const fingerprint = `${normalizedCategory}|${severityRecommendation}|${recommendedDecision}`;

      const signal = {
        id: `insight-${Date.now()}`,
        fingerprint,
        timestamp: new Date().toLocaleTimeString(),
        loggedAtMs: Date.now(),
        imageUrl: `data:image/jpeg;base64,${imageBase64}`,
        category: insightCategory,
        summary: (result.analysis || result.spoken_response || "No notable issues detected").slice(0, 180),
        aiRecommendation:
          findingsList[0]?.recommendation ||
          (recommendedDecision === "PASS"
            ? "Likely low/no impact. Inspector confirms final decision."
            : recommendedDecision === "FURTHER INSPECTION"
            ? "Further inspection recommended. Inspector confirms final decision."
            : "Likely fail condition. Inspector confirms final decision."),
        confidence: confidencePercent,
        severityRecommendation,
        recommendedDecision,
        inspectorDecision: recommendedDecision,
        confirmed: false,
        confirmations: 1,
      };

      const shouldAddInsight = () => {
        const now = Date.now();
        const pending = pendingCandidatesRef.current;
        const logged = lastLoggedByFingerprintRef.current;

        // Cleanup stale candidate entries
        for (const [key, value] of pending.entries()) {
          if (now - value.lastSeenMs > CANDIDATE_STALE_MS) {
            pending.delete(key);
          }
        }

        // Do not spam duplicate cards in short time windows
        const lastLoggedMs = logged.get(signal.fingerprint);
        if (lastLoggedMs && now - lastLoggedMs < INSIGHT_DEDUPE_MS) {
          return { add: false, reason: "dedupe" };
        }

        // Immediate path for high-confidence HIGH severity
        if (
          signal.severityRecommendation === "HIGH" &&
          signal.confidence >= HIGH_IMMEDIATE_CONFIDENCE
        ) {
          logged.set(signal.fingerprint, now);
          return { add: true, confirmations: 1 };
        }

        // Candidate path for medium or non-pass outcomes
        const candidateEligible =
          (signal.severityRecommendation === "MEDIUM" &&
            signal.confidence >= MEDIUM_MIN_CONFIDENCE) ||
          (signal.recommendedDecision !== "PASS" &&
            signal.confidence >= NON_PASS_MIN_CONFIDENCE);

        if (!candidateEligible) {
          return { add: false, reason: "below-threshold" };
        }

        const existing = pending.get(signal.fingerprint);
        if (!existing || now - existing.lastSeenMs > CANDIDATE_STALE_MS) {
          pending.set(signal.fingerprint, {
            count: 1,
            lastSeenMs: now,
          });
          return { add: false, reason: "need-confirmation" };
        }

        const nextCount = existing.count + 1;
        pending.set(signal.fingerprint, {
          count: nextCount,
          lastSeenMs: now,
        });

        if (nextCount < REQUIRED_CONFIRMATIONS) {
          return { add: false, reason: "need-confirmation" };
        }

        pending.delete(signal.fingerprint);
        logged.set(signal.fingerprint, now);
        return { add: true, confirmations: nextCount };
      };

      const gate = shouldAddInsight();
      if (gate.add) {
        setInspectionInsights((prev) => [
          { ...signal, confirmations: gate.confirmations || 1 },
          ...prev,
        ].slice(0, 40));
      }

      // Add findings if detected
      if (result.findings && result.findings.length > 0) {
        const newFindings = result.findings.map((f, idx) => ({
          id: `f-${Date.now()}-${idx}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: f.severity || "MEDIUM",
          title: f.issue || "Issue detected",
          recommendation: f.recommendation || "",
          confidence: 0.9,
          category: "Vision AI"
        }));

        setFindings(prev => [...newFindings, ...prev].slice(0, 20));

        if (result.should_alert) {
          toast.error("Safety Alert!", {
            description: result.analysis,
          });
        }
      }

      // Speak the result through the realtime connection or TTS
      if (speakResult && result.spoken_response) {
        await speakVisionResult(result.spoken_response);
      }

      setAiStatus(isConnected ? "listening" : "idle");
      return result;
    } catch (error) {
      console.error("Vision analysis error:", error);
      setAiStatus(isConnected ? "listening" : "idle");
      return null;
    }
  };

  const setInsightDecision = (insightId, decision) => {
    setInspectionInsights((prev) =>
      prev.map((item) =>
        item.id === insightId
          ? { ...item, inspectorDecision: decision, confirmed: false }
          : item
      )
    );
  };

  const confirmInsightDecision = (insightId) => {
    setInspectionInsights((prev) =>
      prev.map((item) =>
        item.id === insightId
          ? { ...item, confirmed: true, confirmedAt: new Date().toLocaleTimeString() }
          : item
      )
    );
    toast.success("Inspector decision confirmed");
  };

  // Speak vision result via TTS (only used for manual camera capture)
  const speakVisionResult = async (text) => {
    if (!isConnected) {
      // Fall back to TTS API
      try {
        const ttsResponse = await axios.post(`${API_URL}/ai/tts`, {
          text: text,
          voice: "alloy"
        });
        
        if (ttsResponse.data.audio_base64) {
          const audio = new Audio(`data:audio/mp3;base64,${ttsResponse.data.audio_base64}`);
          audio.play();
        }
      } catch (error) {
        console.error("TTS error:", error);
      }
    }
  };

  // Start continuous vision analysis
  const startVisionAnalysis = () => {
    if (visionIntervalRef.current) return;
    
    setVisionEnabled(true);
    setDetectionEnabled(true);
    toast.success("Vision + object detection enabled");
    
    // Analyze immediately (don't auto-speak; results are injected as context for the voice AI)
    const imageBase64 = captureFrame();
    if (imageBase64) {
      analyzeFrameWithVision(imageBase64, false);
    }
    
    // Then every 3 seconds
    visionIntervalRef.current = setInterval(async () => {
      const frame = captureFrame();
      if (frame) {
        await analyzeFrameWithVision(frame, false);
      }
    }, 3000);
  };

  // Stop continuous vision analysis
  const stopVisionAnalysis = () => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    setVisionEnabled(false);
    setDetectionEnabled(false);
    toast.info("Vision + object detection stopped");
  };

  // Toggle object detection (boxes on screen + context for AI)
  const toggleDetection = () => {
    setDetectionEnabled((prev) => !prev);
    if (!detectionEnabled) {
      toast.success("Object detection on — AI can see what's on screen");
    } else {
      toast.info("Object detection off");
    }
  };

  // Toggle vision analysis
  const toggleVisionAnalysis = () => {
    if (visionEnabled) {
      stopVisionAnalysis();
    } else {
      startVisionAnalysis();
    }
  };

  // Inject vision context directly into session instructions so the model always has it
  useEffect(() => {
    if (!isConnected || dataChannelRef.current?.readyState !== "open") return;

    const sendContextUpdate = () => {
      const dc = dataChannelRef.current;
      if (!dc || dc.readyState !== "open") return;

      const visionText = lastVisionResultRef.current;
      const detectionContext = buildDetectionContext(detectionsRef.current, null);

      const visionBlock = visionText && visionText.trim()
        ? `\n\n[CAMERA UPDATE — CURRENT VIEW]\n${visionText}\n${detectionContext}\nUse this to answer any questions about what you see.`
        : `\n\n[CAMERA STATUS] Camera is active. Visual analysis is loading — say "Let me take a closer look" if asked what you see right now.`;

      dc.send(JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: BASE_INSTRUCTIONS + visionBlock,
        }
      }));
    };

    // Send immediately, then every 4s
    sendContextUpdate();
    contextUpdateIntervalRef.current = setInterval(sendContextUpdate, 4000);

    return () => {
      if (contextUpdateIntervalRef.current) {
        clearInterval(contextUpdateIntervalRef.current);
        contextUpdateIntervalRef.current = null;
      }
    };
  }, [isConnected, detectionEnabled, visionEnabled, lastVisionResult]);

  // Capture one initial insight automatically once camera is ready
  useEffect(() => {
    if (!videoRef.current || initialInsightCapturedRef.current) return;
    if (cameraError) return;

    const video = videoRef.current;
    const onReady = () => {
      if (initialInsightCapturedRef.current) return;
      setTimeout(() => {
        const frame = captureFrame();
        if (frame) {
          initialInsightCapturedRef.current = true;
          analyzeFrameWithVision(frame, false);
        }
      }, 1200);
    };

    if (video.readyState >= 2) {
      onReady();
    } else {
      video.addEventListener("loadeddata", onReady, { once: true });
    }

    return () => video.removeEventListener("loadeddata", onReady);
  }, [cameraError, captureFrame]);

  // Disconnect from Realtime API
  const disconnectRealtime = () => {
    // Stop vision analysis
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    if (contextUpdateIntervalRef.current) {
      clearInterval(contextUpdateIntervalRef.current);
      contextUpdateIntervalRef.current = null;
    }
    setVisionEnabled(false);
    setDetectionEnabled(false);
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }
    setIsConnected(false);
    setAiStatus("idle");
  };

  // Toggle connection
  const toggleConnection = () => {
    if (isConnected) {
      disconnectRealtime();
      toast.info("Disconnected from AI");
    } else {
      connectRealtime();
    }
  };

  // Toggle microphone
  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
    toast.info(isMuted ? "Microphone unmuted" : "Microphone muted");
  };

  // Toggle AI audio output
  const toggleAudioOutput = () => {
    if (audioElementRef.current) {
      audioElementRef.current.muted = audioEnabled;
    }
    setAudioEnabled(!audioEnabled);
    toast.info(audioEnabled ? "AI voice muted" : "AI voice unmuted");
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    toast.info(isRecording ? "Recording stopped" : "Recording started");
  };

  const quickMark = (result) => {
    const newFinding = {
      id: `f-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      severity: result === "FAIL" ? "HIGH" : result === "MONITOR" ? "MEDIUM" : "LOW",
      title: `Manual mark: ${result}`,
      recommendation: `Inspector marked this item as ${result}`,
      confidence: 1.0,
      category: "Manual"
    };
    setFindings(prev => [newFinding, ...prev]);
    toast.success(`Marked as ${result}`);
  };

  const finishInspection = async () => {
    setIsGeneratingReport(true);
    disconnectRealtime();
    
    if (isRecording) setIsRecording(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    navigate(`/app/inspections/${id}`);
  };

  const submitInspectorNote = () => {
    const trimmed = noteDraft.trim();
    if (!trimmed) return;

    const note = {
      id: `note-${Date.now()}`,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString(),
    };
    setInspectorNotes((prev) => [note, ...prev]);
    setNoteDraft("");
    toast.success("Note saved");
  };

  useEffect(() => {
    if (!isGeneratingReport) {
      setReportStage(0);
      return;
    }

    let stage = 0;
    const timer = setInterval(() => {
      stage += 1;
      setReportStage(Math.min(stage, REPORT_STAGES.length - 1));
      if (stage >= REPORT_STAGES.length - 1) {
        clearInterval(timer);
      }
    }, 550);

    return () => clearInterval(timer);
  }, [isGeneratingReport]);

  const topDetection = detections?.[0];
  const insightCategory = topDetection ? `${topDetection.label} presence` : "Scene assessment";
  const insightConfidence = Math.round((topDetection?.score ?? 0.89) * 100);
  const insightSeverity = findings.some((f) => f.severity === "HIGH")
    ? "Critical"
    : findings.some((f) => f.severity === "MEDIUM")
    ? "Monitor"
    : "Normal";
  const insightAction = topDetection?.label?.toLowerCase().includes("person")
    ? "Ensure personnel clear of operational zone."
    : topDetection?.label?.toLowerCase().includes("vehicle")
    ? "Verify separation from moving equipment path."
    : "Continue scan and validate clearance envelope.";

  // Loading state
  if (isGeneratingReport) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-[#07090d] flex items-center justify-center" data-testid="generating-report">
        <div className="w-full max-w-xl rounded-xl border border-cyan-500/20 bg-[#0d1118] p-8 shadow-[0_16px_60px_rgba(0,0,0,0.45)]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[24px] font-semibold tracking-tight text-white">Generating Structured Report</h2>
            <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <div className="space-y-3">
            {REPORT_STAGES.map((stage, index) => (
              <div
                key={stage}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 text-[13px] transition-all duration-300",
                  index <= reportStage
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                    : "border-slate-700 bg-slate-900/50 text-slate-400"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    index < reportStage
                      ? "bg-[#F7B500]"
                      : index === reportStage
                      ? "bg-cyan-400 animate-pulse"
                      : "bg-slate-600"
                  )}
                />
                <span>{stage}</span>
              </div>
            ))}
          </div>
      <div className="h-[calc(100vh-4rem)] bg-slate-900 flex items-center justify-center" data-testid="generating-report">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F7B500] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-[22px] font-bold text-white mb-2">Generating Report</h2>
          <p className="text-slate-400 dark:text-white/90 text-[14px]">
            AI is analyzing findings and creating your inspection report...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-[#07090d] flex flex-col text-slate-100" data-testid="live-inspection-page">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="flex-1 flex relative overflow-hidden">
        {/* Video Feed */}
        <div className="flex-1 relative bg-black">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <div className="text-center p-8">
                <VideoOff className="w-16 h-16 text-slate-500 dark:text-white/90 mx-auto mb-4" />
                <p className="text-white mb-4 text-[15px]">{cameraError}</p>
                <Button
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-700"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="camera-feed"
              />
              {/* Object detection overlay - boxes drawn here when detection enabled */}
              <canvas
                ref={detectionCanvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ zIndex: 5 }}
                aria-hidden
              />
              <div className="live-vignette" />
              <div className="gradient-fade-down absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ zIndex: 5 }} />
              <div className="gradient-fade-up absolute inset-x-0 bottom-0 h-32 pointer-events-none" style={{ zIndex: 5 }} />
            </>
          )}

          {/* Top overlay */}
          <div className="live-overlay-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-lg">
                  <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-white">
                    <Truck className="h-3.5 w-3.5 text-[#F7B500]" />
                    <span>CAT D6 Dozer</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[10px] uppercase tracking-wider text-slate-300">
                    <span>Model D6</span>
                    <span>Serial X8R21</span>
                    <span>Daily Walkaround</span>
                  </div>
                </div>
                
                {/* Connection Status */}
                {(isConnected || visionEnabled || detectionEnabled) && (
                  <div className={cn(
                    "live-equipment-badge ai-status-badge border-cyan-500/30",
                    aiStatus === "speaking" ? "bg-[#F7B500]/20 border-[#F7B500]/30" :
                    aiStatus === "listening" ? "bg-emerald-500/20 border-emerald-500/30" :
                    aiStatus === "thinking" ? "bg-cyan-500/20 border-cyan-500/40" :
                    aiStatus === "analyzing" ? "bg-cyan-500/20 border-cyan-500/40" :
                    "bg-slate-500/20 border-slate-500/30"
                  )}>
                    <Brain className={cn(
                      "w-4 h-4",
                      aiStatus === "speaking" ? "text-[#F7B500]" :
                      aiStatus === "listening" ? "text-emerald-400" :
                      aiStatus === "thinking" ? "text-cyan-300" :
                      aiStatus === "analyzing" ? "text-cyan-300" :
                      "text-slate-400"
                      aiStatus === "thinking" ? "text-blue-400" :
                      aiStatus === "analyzing" ? "text-purple-400" :
                      "text-slate-400 dark:text-white/90"
                    )} />
                    <span className={cn(
                      aiStatus === "speaking" ? "text-[#F7B500]" :
                      aiStatus === "listening" ? "text-emerald-400" :
                      aiStatus === "thinking" ? "text-cyan-300" :
                      aiStatus === "analyzing" ? "text-cyan-300" :
                      "text-slate-400"
                      aiStatus === "thinking" ? "text-blue-400" :
                      aiStatus === "analyzing" ? "text-purple-400" :
                      "text-slate-400 dark:text-white/90"
                    )}>
                      {aiStatus === "speaking" ? "AI Speaking" :
                       aiStatus === "listening" ? "Listening" :
                       aiStatus === "thinking" ? "Thinking..." :
                       aiStatus === "analyzing" ? "Analyzing..." :
                       "AI Ready"}
                    </span>
                    {(aiStatus === "listening" || aiStatus === "speaking" || aiStatus === "analyzing") && (
                      <span className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        aiStatus === "speaking" ? "bg-[#F7B500]" : 
                        aiStatus === "analyzing" ? "bg-cyan-300" :
                        "bg-emerald-400"
                      )} />
                    )}
                  </div>
                )}
                
                {isRecording && (
                  <div className="streaming-badge">
                    <span className="streaming-dot" />
                    <span>REC</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="live-equipment-badge">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono">{currentTime}</span>
                </div>
                
                {findings.length > 0 && (
                  <div className="live-equipment-badge bg-[#F7B500]/20 border-[#F7B500]/30">
                    <AlertTriangle className="w-4 h-4 text-[#F7B500]" />
                    <span className="text-[#F7B500] font-semibold">{findings.length}</span>
                    <span className="opacity-80">findings</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Speaking Indicator */}
          {aiStatus === "speaking" && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="ai-speaking-ring-outer">
                <div className="ai-speaking-ring-mid">
                  <div className="ai-speaking-ring-inner">
                    <Volume2 className="w-10 h-10 text-[#F7B500] drop-shadow-lg" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Last Transcript */}
          {lastTranscript && isConnected && (
            <div className="absolute bottom-24 left-4 right-4 pointer-events-none">
              <div className="transcript-overlay-enter bg-black/50 backdrop-blur-xl rounded-2xl p-4 max-w-md border border-white/10">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-1.5">You said</p>
                <p className="text-[13px] text-white/90 leading-relaxed">{lastTranscript}</p>
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 max-w-md">
                <p className="text-[11px] text-slate-400 dark:text-white/90 mb-1">You said:</p>
                <p className="text-[13px] text-white">{lastTranscript}</p>
              </div>
            </div>
          )}

          {/* Structured AI Insight Card */}
          {(lastVisionResult || topDetection) && (visionEnabled || detectionEnabled) && (
            <div className="absolute bottom-24 right-4 pointer-events-none max-w-sm">
              <div className="vision-overlay-enter rounded-lg border border-cyan-400/35 bg-[#081018]/98 p-4 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
                <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Brain className="h-4 w-4 text-cyan-300" />
                  <p className="text-[11px] uppercase tracking-[0.16em] text-sky-300 font-semibold">AI INSPECTION</p>
                </div>
                <div className="space-y-1.5 text-[12px]">
                  <p><span className="text-slate-300">Category:</span> <span className="text-white font-medium">{insightCategory}</span></p>
                  <p><span className="text-slate-300">Confidence:</span> <span className="text-sky-300 font-semibold">{insightConfidence}%</span></p>
                  <p><span className="text-slate-300">Severity:</span> <span className={cn("font-semibold", insightSeverity === "Critical" ? "text-red-300" : insightSeverity === "Monitor" ? "text-amber-300" : "text-emerald-300")}>{insightSeverity}</span></p>
                  <p className="pt-1"><span className="text-slate-300">Action:</span> <span className="text-white">{insightAction}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Rail - Live Findings */}
        <div className="w-80 xl:w-96 bg-[#0d1118] border-l border-slate-800 hidden md:flex md:flex-col overflow-hidden">
          <div className="min-h-0 h-[40%]">
            <LiveFindingsTimeline findings={findings} isRecording={isConnected} />
          </div>
          <div className="border-t border-slate-800 bg-[#0b0f16] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-sky-300 font-semibold">Inspection Insights</p>
              <span className="text-[10px] text-slate-400">{inspectionInsights.length} captured</span>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {inspectionInsights.length === 0 ? (
                <p className="text-[11px] text-slate-500">No AI insights yet. Start vision or capture a frame.</p>
              ) : (
                inspectionInsights.map((insight) => (
                  <div key={insight.id} className="rounded-md border border-slate-700 bg-slate-900/80 p-2.5">
                    <div className="mb-2 flex gap-2">
                      <img
                        src={insight.imageUrl}
                        alt="inspection snapshot"
                        className="h-16 w-24 rounded border border-slate-700 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-white font-medium truncate">{insight.category}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{insight.timestamp}</p>
                        <p className="text-[10px] text-slate-300 mt-1 line-clamp-2">{insight.summary}</p>
                        {insight.confirmations > 1 && (
                          <p className="text-[10px] text-cyan-300 mt-1">Confirmed across {insight.confirmations} frames</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                      <p className="text-slate-300">
                        Severity:{" "}
                        <span className={cn(
                          "font-semibold",
                          insight.severityRecommendation === "HIGH"
                            ? "text-red-300"
                            : insight.severityRecommendation === "MEDIUM"
                            ? "text-amber-300"
                            : "text-emerald-300"
                        )}>
                          {insight.severityRecommendation}
                        </span>
                      </p>
                      <p className="text-slate-300">
                        Confidence: <span className="text-sky-300 font-semibold">{insight.confidence}%</span>
                      </p>
                    </div>
                    <p className="mb-2 text-[10px] text-slate-300">
                      <span className="text-slate-400">AI recommendation:</span>{" "}
                      <span className="text-white">{insight.aiRecommendation}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={insight.inspectorDecision}
                        onChange={(e) => setInsightDecision(insight.id, e.target.value)}
                        className="h-8 flex-1 rounded border border-slate-700 bg-slate-950 text-[11px] text-white px-2 focus:outline-none focus:border-sky-400"
                        data-testid={`insight-decision-${insight.id}`}
                      >
                        <option value="PASS">PASS</option>
                        <option value="FAIL">FAIL</option>
                        <option value="FURTHER INSPECTION">FURTHER INSPECTION</option>
                      </select>
                      <button
                        onClick={() => confirmInsightDecision(insight.id)}
                        className={cn(
                          "h-8 px-2.5 rounded border text-[10px] font-semibold transition-colors",
                          insight.confirmed
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                            : "border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"
                        )}
                        data-testid={`insight-confirm-${insight.id}`}
                      >
                        {insight.confirmed ? "CONFIRMED" : "CONFIRM"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="border-t border-slate-800 bg-[#0b0f16] p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Inspector Notes</p>
            <div className="mb-2 flex gap-2">
              <input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add short note..."
                className="flex-1 h-9 rounded-md border border-slate-700 bg-slate-900 text-white px-3 text-[12px] placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                data-testid="inspector-note-input"
              />
              <button
                onClick={submitInspectorNote}
                className="h-9 px-3 rounded-md bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[12px] font-semibold hover:bg-sky-500/30"
                data-testid="inspector-note-submit"
              >
                Submit
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
              {inspectorNotes.length === 0 ? (
                <p className="text-[11px] text-slate-500">No notes yet.</p>
              ) : (
                inspectorNotes.map((note) => (
                  <div key={note.id} className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] text-slate-100 break-words">{note.text}</p>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">{note.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="live-control-bar border-t border-slate-700/70 bg-[#090c12]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "live-control-btn w-11 h-11 relative border transition-all duration-200",
                isConnected
                  ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
                  : isConnecting
                  ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-300 animate-pulse"
                  : "border-slate-600 bg-slate-800/80 text-slate-200 hover:border-slate-400"
              )}
              onClick={toggleConnection}
              disabled={isConnecting}
              data-testid="ai-connect-btn"
            >
              {isConnected ? <PhoneOff className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </button>
            <button
              className={cn(
                "live-control-btn w-11 h-11 border transition-all duration-200",
                isMuted ? "border-red-400/60 bg-red-500/20 text-red-300" : "border-slate-600 bg-slate-800/80 text-slate-200 hover:border-slate-400"
              )}
              onClick={toggleMute}
              data-testid="mic-toggle-btn"
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              className={cn(
                "live-control-btn w-11 h-11 border transition-all duration-200",
                !audioEnabled ? "border-red-400/60 bg-red-500/20 text-red-300" : "border-slate-600 bg-slate-800/80 text-slate-200 hover:border-slate-400"
              )}
              onClick={toggleAudioOutput}
              data-testid="audio-toggle-btn"
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              className={cn(
                "live-control-btn w-11 h-11 relative border transition-all duration-200",
                detectionEnabled ? "border-[#F7B500]/60 bg-[#F7B500]/15 text-[#F7B500]" : "border-slate-600 bg-slate-800/80 text-slate-200 hover:border-slate-400"
              )}
              onClick={toggleDetection}
              data-testid="detection-toggle-btn"
            >
              <Scan className="w-5 h-5" />
            </button>
            <button
              className={cn(
                "live-control-btn w-11 h-11 relative border transition-all duration-200",
                visionEnabled ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-300" : "border-slate-600 bg-slate-800/80 text-slate-200 hover:border-slate-400"
              )}
              onClick={toggleVisionAnalysis}
              data-testid="vision-toggle-btn"
            >
              {visionEnabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              className={cn(
                "live-control-btn w-14 h-14 border-2 transition-all duration-200",
                isRecording
                  ? "border-red-400 bg-red-500/20 text-red-300"
                  : "border-slate-500 bg-slate-800 text-white hover:border-red-400/70"
              )}
              onClick={toggleRecording}
              data-testid="record-btn"
            >
              {isRecording ? <Square className="w-7 h-7" fill="currentColor" /> : <Video className="w-7 h-7" />}
            </button>
            <button
              className="live-control-btn w-14 h-14 border-2 border-[#F7B500] bg-[#F7B500]/15 text-[#F7B500] hover:bg-[#F7B500]/25 transition-all duration-200"
              onClick={sendImageToAI}
              data-testid="capture-analyze-btn"
            >
              <Camera className="w-7 h-7" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3">
            <div className="flex items-center rounded-lg border border-slate-600 bg-slate-900/70 p-1">
              <button
                className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-emerald-300 hover:bg-emerald-500/15"
                onClick={() => quickMark("PASS")}
                data-testid="mark-pass-btn"
              >
                PASS
              </button>
              <button
                className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-red-300 hover:bg-red-500/15"
                onClick={() => quickMark("FAIL")}
                data-testid="mark-fail-btn"
              >
                FAIL
              </button>
              <button
                className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-amber-300 hover:bg-amber-500/15"
                onClick={() => quickMark("MONITOR")}
                data-testid="mark-monitor-btn"
              >
                MONITOR
              </button>
            </div>
            <Button
              size="lg"
              className="h-12 bg-[#F7B500] hover:bg-[#E5A800] text-slate-900 font-semibold rounded-lg px-8 text-[14px] border border-[#f3d064]"
              onClick={finishInspection}
              data-testid="finish-inspection-btn"
            >
              Finish Inspection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
