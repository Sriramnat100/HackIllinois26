# HackIllinois26 — Codebase Index

**Project:** Cat Inspect AI — AI-powered inspection platform for Caterpillar equipment.  
**Stack:** React 19 + Tailwind + Shadcn UI (frontend) · FastAPI + MongoDB (backend) · OpenAI Realtime/Vision/TTS/STT.

---

## 1. Repository layout

| Path | Purpose |
|------|--------|
| `frontend/` | React SPA (Create React App + Craco) |
| `backend/` | FastAPI server, single-file API |
| `memory/` | Product docs (PRD) |
| `tests/` | Python tests (e.g. realtime API) |
| `test_reports/` | Iteration/test result JSON |
| `design_guidelines.json` | Design system (colors, typography, components) |

---

## 2. Frontend

### 2.1 Entry & routing

- **Entry:** `frontend/src/index.js` → `App.js`
- **Routing:** `frontend/src/App.js` (React Router 7)
  - `/` → redirect to `/app/dashboard`
  - `/app` → `Layout` (outlet)
    - `dashboard` → `Dashboard`
    - `inspections/new` → `NewInspection`
    - `inspections/:id/live` → `LiveInspection`
    - `inspections/:id` → `InspectionDetail`

### 2.2 Pages

| File | Route | Role |
|------|--------|------|
| `frontend/src/pages/Dashboard.jsx` | `/app/dashboard` | Inspections table, analytics cards, chatbot, New Inspection FAB |
| `frontend/src/pages/NewInspection.jsx` | `/app/inspections/new` | 3-step wizard (Equipment → Type → Review) |
| `frontend/src/pages/LiveInspection.jsx` | `/app/inspections/:id/live` | WebRTC camera, OpenAI Realtime voice, vision, live findings, controls |
| `frontend/src/pages/InspectionDetail.jsx` | `/app/inspections/:id` | Tabs: Summary, Checklist, Media, Parts, Connect |

### 2.3 App-specific components

| Component | Path | Role |
|-----------|------|------|
| Layout | `frontend/src/components/Layout.jsx` | App shell, nav, outlet |
| TopBar | `frontend/src/components/TopBar.jsx` | Top navigation |
| StatusBadge | `frontend/src/components/StatusBadge.jsx` | PASS/FAIL/MONITOR/Draft/In Progress/Submitted |
| InspectionTable | `frontend/src/components/InspectionTable.jsx` | Dashboard inspections list |
| ChatDock | `frontend/src/components/ChatDock.jsx` | AI chatbot widget |
| AnalyticsCards | `frontend/src/components/AnalyticsCards.jsx` | Dashboard analytics |
| InspectionWizard | `frontend/src/components/InspectionWizard.jsx` | New inspection steps |
| LiveFindingsTimeline | `frontend/src/components/LiveFindingsTimeline.jsx` | Live inspection findings |
| MediaGallery | `frontend/src/components/MediaGallery.jsx` | Inspection media |
| PartsMatchList | `frontend/src/components/PartsMatchList.jsx` | Parts matches |
| ConnectClusters | `frontend/src/components/ConnectClusters.jsx` | Similar inspections / clusters |

### 2.4 UI library (Shadcn-style)

- **Location:** `frontend/src/components/ui/`
- **Examples:** `button.jsx`, `card.jsx`, `dialog.jsx`, `tabs.jsx`, `table.jsx`, `input.jsx`, `form.jsx`, `toast.jsx`, `sonner.jsx`, `dropdown-menu.jsx`, etc.
- **Config:** `frontend/components.json` (Shadcn), `frontend/tailwind.config.js`, `frontend/postcss.config.js`

### 2.5 Utilities & hooks

- `frontend/src/lib/utils.js` — `cn()` (Tailwind merge), etc.
- `frontend/src/hooks/use-toast.js` — toast hook

### 2.6 Build & config

- **Package manager:** Yarn (`frontend/package.json`)
- **Scripts:** `yarn start` (Craco), `yarn build`, `yarn test`
- **Config:** `frontend/craco.config.js`, `frontend/jsconfig.json` (path `@/`)

---

## 3. Backend

### 3.1 Single API module

- **File:** `backend/server.py`
- **App:** FastAPI app, CORS enabled
- **Routers:** `api_router` (prefix `/api`), `realtime_router` (prefix `/api/ai` when OpenAI key set)

### 3.2 API routes (prefix `/api`)

| Method | Path | Handler / purpose |
|--------|------|-------------------|
| GET | `/` | Root message |
| POST | `/status` | Create status check (in-memory) |
| GET | `/status` | List status checks |
| GET | `/inspections` | List inspections (query: status, inspection_type, search) |
| GET | `/inspections/{id}` | Inspection detail |
| POST | `/inspections` | Create inspection |
| PUT | `/inspections/{id}/checklist/{item_id}` | Update checklist item |
| POST | `/inspections/{id}/finish` | Finish inspection |
| GET | `/analytics` | Analytics (failed parts, over time, pass/fail/monitor) |
| POST | `/chat` | AI chat (OpenAI GPT-4o) |
| POST | `/ai/vision/analyze` | Vision analysis (image base64) |
| POST | `/ai/tts` | Text-to-speech |
| POST | `/ai/stt` | Speech-to-text |
| POST | `/inspections/{id}/media` | Upload inspection media |
| GET | `/inspections/{id}/media` | List inspection media |
| GET | `/inspections/{id}/media/{media_id}` | Get single media |

Realtime (when configured) is under `/api/ai` via `realtime_router` (e.g. session creation, WebRTC negotiate).

### 3.3 Key models (Pydantic in `server.py`)

- `Inspection`, `InspectionCreate`, `Finding`, `ChecklistItem`, `PartMatch`, `MediaItem`
- `ChatRequest`, `ChatResponse`, `ChatMessage`
- `VisionAnalysisRequest`, `VisionAnalysisResponse`
- `TTSRequest`, `STTRequest`
- `AnalyticsData`, `StatusCheck`, `StatusCheckCreate`

### 3.4 Data

- **In-memory:** Status checks stored in `STATUS_CHECKS` list. Inspections and media in `MOCK_INSPECTIONS`, `CREATED_INSPECTIONS`, `INSPECTION_MEDIA`. No MongoDB required.
- **In-memory:** `MOCK_INSPECTIONS`, `MOCK_ANALYTICS`, `MOCK_INSPECTION_DETAIL`, `CREATED_INSPECTIONS` for inspections until persistence is wired.

### 3.5 Env / secrets

- Backend expects `.env` in `backend/` (or same dir as `server.py`).
- `OPENAI_API_KEY` or `EMERGENT_LLM_KEY` for OpenAI and Realtime.

---

## 4. Design system

- **File:** `design_guidelines.json`
- **Contents:** Typography (Inter, scales), colors (primary #F9A825, status, background), spacing, radius/shadows, and component tokens (buttons, cards, badges, FAB, etc.).

---

## 5. Docs & tests

- **PRD / product context:** `memory/PRD.md` (personas, features, backlog, Realtime/Vision flow).
- **Python tests:** `backend/tests/test_realtime_api.py`, `tests/__init__.py`; root `backend_test.py`.
- **Reports:** `test_result.md`, `test_reports/iteration_*.json`.

---

## 6. Quick finder

- **Where are inspections listed?** → `GET /api/inspections` in `backend/server.py`; UI in `frontend/src/pages/Dashboard.jsx` + `InspectionTable.jsx`.
- **Where is live voice/vision?** → `frontend/src/pages/LiveInspection.jsx`; backend Realtime under `/api/ai` in `server.py`; vision via `POST /api/ai/vision/analyze`.
- **Where is the chatbot?** → `frontend/src/components/ChatDock.jsx`; backend `POST /api/chat` in `server.py`.
- **Where is inspection CRUD?** → Backend: `server.py` (get list, get one, create, finish, checklist update, media). Frontend: Dashboard, NewInspection, InspectionDetail, LiveInspection.
- **Where is design system defined?** → `design_guidelines.json`; Tailwind in `frontend/tailwind.config.js`; Shadcn in `frontend/components.json` and `frontend/src/components/ui/`.
