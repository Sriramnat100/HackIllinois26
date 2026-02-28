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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LiveInspection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
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
  const visionIntervalRef = useRef(null);

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
      return response.data;
    } catch (error) {
      console.error("Failed to get ephemeral token:", error);
      throw error;
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
        
        // Configure session for equipment inspection
        const sessionConfig = {
          type: "session.update",
          session: {
            instructions: `You are an expert Caterpillar equipment inspector AI assistant conducting a live inspection. 
            
Your job is to:
- Listen to the inspector's observations and questions
- Provide real-time guidance on what to look for
- Alert them to potential safety hazards
- Help identify parts and components
- Suggest maintenance recommendations

Be concise and direct in your responses. Speak naturally as if you're alongside the inspector.
When you identify issues, categorize them as HIGH (safety critical), MEDIUM (needs attention), or LOW (minor) severity.

Start by greeting the inspector and asking what equipment they're inspecting today.`,
            voice: "alloy",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
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
      const model = sessionData.model || "gpt-4o-realtime-preview-2024-12-17";
      const openaiResponse = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        throw new Error(`OpenAI connection failed: ${openaiResponse.status} - ${errorText}`);
      }

      const answerSdp = await openaiResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      
      setIsConnected(true);
      setIsConnecting(false);
      toast.success("Connected to AI Inspector");
      console.log("WebRTC connection established");

    } catch (error) {
      console.error("Connection error:", error);
      setIsConnecting(false);
      setIsConnected(false);
      toast.error("Failed to connect to AI: " + (error.response?.data?.detail || error.message));
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
          if (content.type === "text" || content.type === "output_text") {
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

  // Speak vision result - inject into realtime conversation or use TTS
  const speakVisionResult = async (text) => {
    // If connected to realtime, send as assistant message to be spoken
    if (isConnected && dataChannelRef.current?.readyState === "open") {
      // Create a response with the vision analysis
      const visionMessage = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "text",
              text: text
            }
          ]
        }
      };
      dataChannelRef.current.send(JSON.stringify(visionMessage));
      
      // Trigger audio response
      dataChannelRef.current.send(JSON.stringify({ 
        type: "response.create",
        response: {
          modalities: ["audio"],
          instructions: `Say exactly this: "${text}"`
        }
      }));
    } else {
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
    toast.success("Auto vision analysis started (every 5 seconds)");
    
    // Analyze immediately
    const imageBase64 = captureFrame();
    if (imageBase64) {
      analyzeFrameWithVision(imageBase64, true);
    }
    
    // Then every 5 seconds
    visionIntervalRef.current = setInterval(async () => {
      const frame = captureFrame();
      if (frame) {
        await analyzeFrameWithVision(frame, true);
      }
    }, 5000);
  };

  // Stop continuous vision analysis
  const stopVisionAnalysis = () => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    setVisionEnabled(false);
    toast.info("Auto vision analysis stopped");
  };

  // Toggle vision analysis
  const toggleVisionAnalysis = () => {
    if (visionEnabled) {
      stopVisionAnalysis();
    } else {
      startVisionAnalysis();
    }
  };

  // Disconnect from Realtime API
  const disconnectRealtime = () => {
    // Stop vision analysis
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    setVisionEnabled(false);
    
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

  // Capture frame from video
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    return dataUrl.split(',')[1];
  }, []);

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

  // Loading state
  if (isGeneratingReport) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-slate-900 flex items-center justify-center" data-testid="generating-report">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F7B500] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-[22px] font-bold text-white mb-2">Generating Report</h2>
          <p className="text-slate-400 text-[14px]">
            AI is analyzing findings and creating your inspection report...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-slate-900 flex flex-col" data-testid="live-inspection-page">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="flex-1 flex relative overflow-hidden">
        {/* Video Feed */}
        <div className="flex-1 relative bg-black">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <div className="text-center p-8">
                <VideoOff className="w-16 h-16 text-slate-500 mx-auto mb-4" />
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
              <div className="gradient-fade-down absolute inset-x-0 top-0 h-32 pointer-events-none" />
              <div className="gradient-fade-up absolute inset-x-0 bottom-0 h-48 pointer-events-none" />
            </>
          )}

          {/* Top overlay */}
          <div className="live-overlay-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="live-equipment-badge">
                  <Truck className="w-4 h-4" />
                  <span>CAT D6 Dozer</span>
                </div>
                
                {/* Connection Status */}
                {(isConnected || visionEnabled) && (
                  <div className={cn(
                    "live-equipment-badge",
                    aiStatus === "speaking" ? "bg-[#F7B500]/20 border-[#F7B500]/30" :
                    aiStatus === "listening" ? "bg-emerald-500/20 border-emerald-500/30" :
                    aiStatus === "thinking" ? "bg-blue-500/20 border-blue-500/30" :
                    aiStatus === "analyzing" ? "bg-purple-500/20 border-purple-500/30" :
                    "bg-slate-500/20 border-slate-500/30"
                  )}>
                    <Brain className={cn(
                      "w-4 h-4",
                      aiStatus === "speaking" ? "text-[#F7B500]" :
                      aiStatus === "listening" ? "text-emerald-400" :
                      aiStatus === "thinking" ? "text-blue-400" :
                      aiStatus === "analyzing" ? "text-purple-400" :
                      "text-slate-400"
                    )} />
                    <span className={cn(
                      aiStatus === "speaking" ? "text-[#F7B500]" :
                      aiStatus === "listening" ? "text-emerald-400" :
                      aiStatus === "thinking" ? "text-blue-400" :
                      aiStatus === "analyzing" ? "text-purple-400" :
                      "text-slate-400"
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
                        aiStatus === "analyzing" ? "bg-purple-400" :
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
              <div className="w-32 h-32 rounded-full bg-[#F7B500]/20 flex items-center justify-center animate-pulse">
                <div className="w-24 h-24 rounded-full bg-[#F7B500]/40 flex items-center justify-center">
                  <Volume2 className="w-12 h-12 text-[#F7B500]" />
                </div>
              </div>
            </div>
          )}

          {/* Last Transcript */}
          {lastTranscript && isConnected && (
            <div className="absolute bottom-24 left-4 right-4 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 max-w-md">
                <p className="text-[11px] text-slate-400 mb-1">You said:</p>
                <p className="text-[13px] text-white">{lastTranscript}</p>
              </div>
            </div>
          )}

          {/* Last Vision Result */}
          {lastVisionResult && visionEnabled && (
            <div className="absolute bottom-24 right-4 pointer-events-none max-w-sm">
              <div className="bg-purple-900/80 backdrop-blur-sm rounded-lg p-3 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-3 h-3 text-purple-400" />
                  <p className="text-[11px] text-purple-300">Vision AI:</p>
                </div>
                <p className="text-[13px] text-white">{lastVisionResult}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Rail - Live Findings */}
        <div className="w-80 xl:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 hidden md:block overflow-hidden">
          <LiveFindingsTimeline findings={findings} isRecording={isConnected} />
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="live-control-bar">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          {/* Connect/Disconnect AI */}
          <button
            className={cn(
              "live-control-btn touch-target-lg relative",
              isConnected 
                ? "bg-emerald-500 text-white" 
                : isConnecting
                ? "bg-blue-500 text-white animate-pulse"
                : "bg-slate-700 text-white border border-slate-600"
            )}
            onClick={toggleConnection}
            disabled={isConnecting}
            data-testid="ai-connect-btn"
          >
            {isConnected ? (
              <PhoneOff className="w-6 h-6" />
            ) : (
              <Phone className="w-6 h-6" />
            )}
          </button>

          {/* Mute/Unmute Mic */}
          <button
            className={cn(
              "live-control-btn touch-target-lg",
              isMuted ? "bg-red-600 text-white" : "live-control-btn-secondary"
            )}
            onClick={toggleMute}
            data-testid="mic-toggle-btn"
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Start/Stop Recording */}
          <button
            className={cn(
              "live-control-btn touch-target-lg",
              isRecording ? "live-control-btn-danger" : "live-control-btn-secondary"
            )}
            onClick={toggleRecording}
            data-testid="record-btn"
          >
            {isRecording ? (
              <Square className="w-6 h-6" fill="currentColor" />
            ) : (
              <Video className="w-6 h-6" />
            )}
          </button>

          {/* Capture & Analyze Photo */}
          <button
            className={cn(
              "live-control-btn touch-target-lg",
              isConnected ? "live-control-btn-primary" : "live-control-btn-secondary"
            )}
            onClick={sendImageToAI}
            data-testid="capture-analyze-btn"
          >
            <Camera className="w-6 h-6" />
          </button>

          {/* Toggle AI Audio */}
          <button
            className={cn(
              "live-control-btn touch-target-lg",
              !audioEnabled ? "bg-red-600 text-white" : "live-control-btn-secondary"
            )}
            onClick={toggleAudioOutput}
            data-testid="audio-toggle-btn"
          >
            {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          {/* Toggle Auto Vision Analysis */}
          <button
            className={cn(
              "live-control-btn touch-target-lg relative",
              visionEnabled 
                ? "bg-purple-600 text-white" 
                : "live-control-btn-secondary"
            )}
            onClick={toggleVisionAnalysis}
            data-testid="vision-toggle-btn"
            title={visionEnabled ? "Stop auto vision" : "Start auto vision (analyzes every 5s)"}
          >
            {visionEnabled ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
            {visionEnabled && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
            )}
          </button>

          <div className="w-px h-10 bg-slate-700 mx-1 hidden sm:block" />

          {/* Quick Mark Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              className="live-quick-mark bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => quickMark("PASS")}
              data-testid="mark-pass-btn"
            >
              <CheckCircle className="w-4 h-4" />
              PASS
            </button>
            <button
              className="live-quick-mark bg-red-600 hover:bg-red-700 text-white"
              onClick={() => quickMark("FAIL")}
              data-testid="mark-fail-btn"
            >
              <XCircle className="w-4 h-4" />
              FAIL
            </button>
            <button
              className="live-quick-mark bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => quickMark("MONITOR")}
              data-testid="mark-monitor-btn"
            >
              <AlertTriangle className="w-4 h-4" />
              MONITOR
            </button>
          </div>

          <div className="w-px h-10 bg-slate-700 mx-1 hidden sm:block" />

          {/* Finish Inspection */}
          <Button
            size="lg"
            className="h-12 bg-[#F7B500] hover:bg-[#E5A800] text-slate-900 font-semibold rounded-full px-6 text-[14px]"
            onClick={finishInspection}
            data-testid="finish-inspection-btn"
          >
            Finish Inspection
          </Button>
        </div>
      </div>
    </div>
  );
}
