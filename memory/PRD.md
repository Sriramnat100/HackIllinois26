# Cat Inspect AI - Product Requirements Document

## Original Problem Statement
Build a production-quality web app UI called "Cat Inspect AI", an AI-powered inspection platform for Caterpillar equipment inspectors. Primary user: a field inspector who needs to do inspections fast, safely, and with minimal manual paperwork.

## User Persona
- **Primary User**: Field Inspector (e.g., "Sriram N.")
- **Context**: Working in the field with Caterpillar equipment
- **Needs**: Fast inspections, safety prioritization, minimal paperwork, low cognitive load
- **Device Usage**: Desktop/laptop, tablet (touch-optimized)

## Core Requirements (Static)
1. Dashboard with previous inspections table, AI chatbot, and analytics
2. New Inspection wizard (3-step: Equipment, Type, Review)
3. Live Inspection page with real-time camera feed and AI-powered findings
4. Inspection Detail page with tabs (Summary, Checklist, Media, Parts, Connect)
5. Status badges: PASS, FAIL, MONITOR, Draft, In Progress, Submitted
6. OpenAI-powered chatbot for inspection data analysis

## What's Been Implemented (Feb 28, 2026)

### Backend (FastAPI)
- ✅ REST API with /api prefix
- ✅ GET /api/inspections - List inspections with search/filter
- ✅ GET /api/inspections/{id} - Get inspection detail
- ✅ POST /api/inspections - Create new inspection
- ✅ PUT /api/inspections/{id}/checklist/{item_id} - Update checklist item
- ✅ POST /api/inspections/{id}/finish - Finish inspection
- ✅ GET /api/analytics - Get analytics data
- ✅ POST /api/chat - AI chatbot endpoint (OpenAI GPT-4o)
- ✅ POST /api/ai/vision/analyze - Vision analysis endpoint
- ✅ POST /api/ai/tts - Text-to-speech endpoint
- ✅ POST /api/ai/stt - Speech-to-text endpoint
- ✅ POST /api/ai/realtime/session - OpenAI Realtime API session creation
- ✅ POST /api/ai/realtime/negotiate - WebRTC SDP negotiation
- ✅ POST /api/inspections/{id}/media - Upload media (photo/video)
- ✅ GET /api/inspections/{id}/media - Get inspection media
- ✅ Mock data for inspections and analytics

### Frontend (React + Tailwind + Shadcn UI)
- ✅ Dashboard (/app/dashboard)
  - Inspections table with search, filters, export
  - Analytics cards (Failed Parts, Inspections Over Time, Pass/Fail/Monitor)
  - AI Chatbot widget with suggested prompts
  - New Inspection FAB
- ✅ New Inspection (/app/inspections/new)
  - 3-step wizard (Equipment, Type, Review)
  - Summary card with live updates
- ✅ Live Inspection (/app/inspections/:id/live)
  - WebRTC camera integration
  - **OpenAI Realtime API integration for real-time voice conversation**
  - AI status indicators (listening, thinking, speaking)
  - Live Findings timeline
  - Control bar (Connect AI, Mic, Record, Capture, Audio)
  - Quick mark buttons (PASS/FAIL/MONITOR)
  - Photo capture and storage
- ✅ Inspection Detail (/app/inspections/:id)
  - 5 tabs: Summary, Checklist, Media, Parts, Connect
  - Editable checklist items
  - Regenerate report, Share functionality

### Components
- StatusBadge, SeverityBadge
- InspectionTable, ChatDock
- LiveFindingsTimeline, AnalyticsCards
- InspectionWizard, MediaGallery
- PartsMatchList, ConnectClusters
- TopBar, Layout

## Prioritized Backlog

### P0 - Critical (Completed)
- ✅ All routes functional
- ✅ Inspections CRUD
- ✅ AI chatbot integration
- ✅ Live inspection with camera
- ✅ OpenAI Realtime API for real-time voice + vision

### P1 - High Priority (Next Phase)
- [ ] Implement video recording and storage (photos working, videos pending)
- [ ] User authentication (currently skipped per user request)
- [ ] Persist inspection data to MongoDB

### P2 - Medium Priority
- [ ] Export to PDF functionality
- [ ] Offline support for field use
- [ ] Push notifications for safety alerts
- [ ] Multi-language support
- [ ] AI confidence threshold settings

### P3 - Nice to Have
- [ ] Custom inspection templates
- [ ] Fleet management integration
- [ ] Predictive maintenance analytics
- [ ] Mobile app (React Native)
- [ ] Pre-fill equipment data for repeat inspections

## Technical Stack
- Frontend: React 19, Tailwind CSS, Shadcn UI, Recharts
- Backend: FastAPI, Python 3.x
- Database: MongoDB (mock data currently)
- AI: OpenAI GPT-4o Realtime via WebRTC (emergentintegrations library)
- Camera: WebRTC (navigator.mediaDevices)

## OpenAI Realtime API Integration
The live inspection page uses a **hybrid approach** for real-time AI:

### Voice Conversation (OpenAI Realtime API)
1. Backend creates ephemeral session via `/api/ai/realtime/session`
2. Frontend receives ephemeral key (ek_*) 
3. Frontend establishes WebRTC connection directly to OpenAI
4. Bidirectional audio streaming for real-time voice conversation
5. AI responds via voice with equipment inspection guidance

### Real-Time Vision (GPT-4o Vision API)
**Note:** OpenAI Realtime API does NOT support video/vision - it's audio-only.
The vision feature uses a hybrid approach:
1. Auto Vision mode captures frames every 5 seconds
2. Frames sent to GPT-4o Vision API (`/api/ai/vision/analyze`)
3. Analysis results spoken back via TTS or injected into voice conversation
4. Findings automatically added to the Live Findings timeline

### Control Bar Buttons
- Phone: Connect/disconnect voice AI (Realtime API)
- Mic: Mute/unmute microphone
- Video: Start/stop recording
- Camera: Capture & analyze single photo
- Speaker: Toggle AI audio output
- Eye: Toggle auto vision analysis (every 5s)
- PASS/FAIL/MONITOR: Quick mark buttons

## Next Tasks
1. Implement video recording and storage
2. Add real MongoDB persistence for inspections
3. Add authentication if needed
4. Export reports to PDF
