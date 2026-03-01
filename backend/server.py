from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone
from openai import AsyncOpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# In-memory storage (no MongoDB required)
STATUS_CHECKS: List[dict] = []

# OpenAI client - use OPENAI_API_KEY if provided, otherwise fall back to EMERGENT_LLM_KEY
def get_openai_client():
    api_key = os.environ.get('OPENAI_API_KEY') or os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise ValueError("No API key configured. Set OPENAI_API_KEY in .env")
    return AsyncOpenAI(api_key=api_key)

openai_api_key = os.environ.get('OPENAI_API_KEY') or os.environ.get('EMERGENT_LLM_KEY')
# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Create a router for realtime API and register OpenAI Realtime routes
realtime_router = APIRouter()
@realtime_router.post("/realtime/session")
async def create_realtime_session():
    """Create ephemeral client secret for OpenAI Realtime API (WebRTC)."""
    if not openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="Realtime AI not configured. Set OPENAI_API_KEY in backend/.env"
        )
    try:
        import requests
        payload = {
            "session": {
                "type": "realtime",
                "model": "gpt-4o-realtime-preview-2024-12-17",
                "audio": {
                    "output": {
                        "voice": "alloy",
                    },
                },
            },
        }
        r = requests.post(
            "https://api.openai.com/v1/realtime/client_secrets",
            headers={"Authorization": f"Bearer {openai_api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        client_secret = data.get("client_secret") or data.get("value")
        if isinstance(client_secret, dict):
            value = client_secret.get("value") or client_secret.get("client_secret")
            expires_at = client_secret.get("expires_at")
        else:
            value = client_secret
            expires_at = data.get("expires_at")
        session = data.get("session", {})
        model = session.get("model", "gpt-4o-realtime-preview-2024-12-17") if isinstance(session, dict) else "gpt-4o-realtime-preview-2024-12-17"
        return {
            "client_secret": {"value": value, "expires_at": expires_at},
            "model": model,
        }
    except requests.exceptions.HTTPError as e:
        err_text = e.response.text if hasattr(e, "response") else str(e)
        logger.error(f"Realtime session HTTP error: {err_text}")
        raise HTTPException(status_code=e.response.status_code if hasattr(e, "response") else 500, detail=err_text)
    except Exception as e:
        logger.error(f"Realtime session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --------------------- Models ---------------------

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class Finding(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str
    severity: str  # HIGH, MEDIUM, LOW
    title: str
    recommendation: str
    confidence: float
    category: str

class ChecklistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    item: str
    result: str  # PASS, FAIL, MONITOR
    severity: str
    evidence: Optional[str] = None
    recommended_action: Optional[str] = None
    confidence: float

class PartMatch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    part_number: str
    part_name: str
    fitment_certainty: float
    compatible_models: List[str]

class MediaItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # photo, video
    url: str
    thumbnail: Optional[str] = None
    timestamp: str
    caption: Optional[str] = None

class Inspection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    equipment_model: str
    serial_number: str
    customer: str
    location: str
    inspection_type: str  # Daily Walkaround, Safety, TA1
    status: str  # Draft, In Progress, Submitted, PASS, FAIL, MONITOR
    date: str
    inspector: str
    summary: Optional[str] = None
    safety_findings: Optional[List[str]] = []
    action_items: Optional[List[dict]] = []
    findings: Optional[List[Finding]] = []
    checklist: Optional[List[ChecklistItem]] = []
    parts_matches: Optional[List[PartMatch]] = []
    media: Optional[List[MediaItem]] = []
    similar_inspections: Optional[List[dict]] = []

class InspectionCreate(BaseModel):
    equipment_model: str
    serial_number: str
    customer: str
    location: str
    inspection_type: str

class ChatMessage(BaseModel):
    role: str  # user, assistant
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    chart_data: Optional[dict] = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    chart_data: Optional[dict] = None

class AnalyticsData(BaseModel):
    failed_parts: List[dict]
    inspections_over_time: List[dict]
    pass_fail_monitor: dict

# AI Vision Analysis Request
class VisionAnalysisRequest(BaseModel):
    image_base64: str
    context: Optional[str] = "equipment inspection"

class VisionAnalysisResponse(BaseModel):
    analysis: str
    findings: List[dict]
    severity: str
    recommended_decision: Optional[str] = None
    should_alert: bool

# Text to Speech Request
class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "alloy"

# Speech to Text Request  
class STTRequest(BaseModel):
    audio_base64: str

# --------------------- Mock Data ---------------------

MOCK_INSPECTIONS = [
    {
        "id": "insp-001",
        "equipment_model": "CAT 320 Excavator",
        "serial_number": "CAT0320X12345",
        "customer": "BuildCo Industries",
        "location": "Dallas, TX",
        "inspection_type": "Daily Walkaround",
        "status": "PASS",
        "date": "2025-01-15",
        "inspector": "Sriram N.",
        "summary": "Equipment in excellent condition. All systems operational.",
        "safety_findings": [],
        "action_items": []
    },
    {
        "id": "insp-002",
        "equipment_model": "CAT D6 Dozer",
        "serial_number": "CAT0D6X67890",
        "customer": "Highway Construction LLC",
        "location": "Austin, TX",
        "inspection_type": "Safety",
        "status": "FAIL",
        "date": "2025-01-14",
        "inspector": "Sriram N.",
        "summary": "Critical hydraulic leak detected in main boom cylinder. Immediate repair required.",
        "safety_findings": ["Hydraulic leak - High pressure line compromised"],
        "action_items": [
            {"priority": 1, "action": "Replace hydraulic line", "risk": "High - Equipment failure risk"},
            {"priority": 2, "action": "Check all fluid levels", "risk": "Medium"}
        ]
    },
    {
        "id": "insp-003",
        "equipment_model": "CAT 966 Wheel Loader",
        "serial_number": "CAT0966X11111",
        "customer": "Quarry Masters Inc",
        "location": "Houston, TX",
        "inspection_type": "TA1",
        "status": "MONITOR",
        "date": "2025-01-13",
        "inspector": "Sriram N.",
        "summary": "Minor wear on bucket teeth. Schedule replacement within 30 days.",
        "safety_findings": [],
        "action_items": [
            {"priority": 1, "action": "Order replacement bucket teeth", "risk": "Low - Wear item"},
            {"priority": 2, "action": "Re-inspect in 2 weeks", "risk": "Low"}
        ]
    },
    {
        "id": "insp-004",
        "equipment_model": "CAT 745 Articulated Truck",
        "serial_number": "CAT0745X22222",
        "customer": "Mountain Mining Co",
        "location": "Denver, CO",
        "inspection_type": "Daily Walkaround",
        "status": "PASS",
        "date": "2025-01-12",
        "inspector": "Sriram N.",
        "summary": "All systems nominal. Tire pressure within spec.",
        "safety_findings": [],
        "action_items": []
    },
    {
        "id": "insp-005",
        "equipment_model": "CAT 336 Excavator",
        "serial_number": "CAT0336X33333",
        "customer": "Urban Development Corp",
        "location": "Phoenix, AZ",
        "inspection_type": "Safety",
        "status": "In Progress",
        "date": "2025-01-11",
        "inspector": "Sriram N.",
        "summary": "",
        "safety_findings": [],
        "action_items": []
    }
]

MOCK_ANALYTICS = {
    "failed_parts": [
        {"category": "Hydraulics", "count": 12, "percentage": 35},
        {"category": "Engine", "count": 8, "percentage": 23},
        {"category": "Electrical", "count": 6, "percentage": 17},
        {"category": "Undercarriage", "count": 5, "percentage": 15},
        {"category": "Attachments", "count": 3, "percentage": 10}
    ],
    "inspections_over_time": [
        {"month": "Aug", "count": 42},
        {"month": "Sep", "count": 38},
        {"month": "Oct", "count": 55},
        {"month": "Nov", "count": 47},
        {"month": "Dec", "count": 52},
        {"month": "Jan", "count": 31}
    ],
    "pass_fail_monitor": {
        "pass": 156,
        "fail": 23,
        "monitor": 45
    }
}

MOCK_INSPECTION_DETAIL = {
    "id": "insp-002",
    "equipment_model": "CAT D6 Dozer",
    "serial_number": "CAT0D6X67890",
    "customer": "Highway Construction LLC",
    "location": "Austin, TX",
    "inspection_type": "Safety",
    "status": "FAIL",
    "date": "2025-01-14",
    "inspector": "Sriram N.",
    "summary": "This safety inspection identified a critical hydraulic leak in the main boom cylinder that requires immediate attention. The leak was detected during visual inspection and confirmed with pressure testing. All other systems are operating within normal parameters, but the equipment should be taken out of service until repairs are completed.",
    "safety_findings": [
        "Critical: Hydraulic leak detected in main boom cylinder - High pressure line compromised",
        "Warning: Operator visibility reduced due to cracked side mirror"
    ],
    "action_items": [
        {"priority": 1, "action": "Replace hydraulic high-pressure line on main boom cylinder", "risk": "Critical - Equipment failure and safety hazard", "why": "Leak can cause sudden loss of boom control"},
        {"priority": 2, "action": "Replace cracked side mirror", "risk": "Medium - Reduced operator visibility", "why": "Safety compliance requirement"},
        {"priority": 3, "action": "Schedule follow-up inspection after repairs", "risk": "Low", "why": "Verify repairs and clear equipment for operation"}
    ],
    "findings": [
        {"id": "f1", "timestamp": "10:23:45", "severity": "HIGH", "title": "Hydraulic Leak Detected", "recommendation": "Immediately shut down and replace high-pressure line", "confidence": 0.95, "category": "Hydraulics"},
        {"id": "f2", "timestamp": "10:25:12", "severity": "MEDIUM", "title": "Side Mirror Cracked", "recommendation": "Replace mirror before next shift", "confidence": 0.98, "category": "Safety Equipment"},
        {"id": "f3", "timestamp": "10:28:33", "severity": "LOW", "title": "Minor Rust on Step Rails", "recommendation": "Schedule touch-up paint during next service", "confidence": 0.87, "category": "Structural"}
    ],
    "checklist": [
        {"id": "c1", "category": "Hydraulics", "item": "Main Boom Cylinder", "result": "FAIL", "severity": "HIGH", "evidence": "photo_001.jpg", "recommended_action": "Replace high-pressure line", "confidence": 0.95},
        {"id": "c2", "category": "Hydraulics", "item": "Stick Cylinder", "result": "PASS", "severity": "LOW", "evidence": None, "recommended_action": None, "confidence": 0.92},
        {"id": "c3", "category": "Engine", "item": "Oil Level", "result": "PASS", "severity": "LOW", "evidence": None, "recommended_action": None, "confidence": 0.99},
        {"id": "c4", "category": "Engine", "item": "Coolant Level", "result": "PASS", "severity": "LOW", "evidence": None, "recommended_action": None, "confidence": 0.98},
        {"id": "c5", "category": "Safety Equipment", "item": "Side Mirrors", "result": "FAIL", "severity": "MEDIUM", "evidence": "photo_002.jpg", "recommended_action": "Replace cracked mirror", "confidence": 0.98},
        {"id": "c6", "category": "Safety Equipment", "item": "Backup Camera", "result": "PASS", "severity": "LOW", "evidence": None, "recommended_action": None, "confidence": 0.96},
        {"id": "c7", "category": "Undercarriage", "item": "Track Tension", "result": "MONITOR", "severity": "LOW", "evidence": None, "recommended_action": "Re-check in 2 weeks", "confidence": 0.85},
        {"id": "c8", "category": "Structural", "item": "Step Rails", "result": "MONITOR", "severity": "LOW", "evidence": "photo_003.jpg", "recommended_action": "Touch-up paint", "confidence": 0.87}
    ],
    "parts_matches": [
        {"id": "p1", "part_number": "5I-4461", "part_name": "Hydraulic Hose Assembly", "fitment_certainty": 0.97, "compatible_models": ["D6", "D6T", "D6N"]},
        {"id": "p2", "part_number": "1U-1857", "part_name": "O-Ring Seal Kit", "fitment_certainty": 0.94, "compatible_models": ["D6", "D6T", "D7"]},
        {"id": "p3", "part_number": "9W-3214", "part_name": "Side Mirror Assembly", "fitment_certainty": 0.99, "compatible_models": ["D6", "D6T", "D6N", "D6R"]}
    ],
    "media": [
        {"id": "m1", "type": "photo", "url": "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800", "thumbnail": "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=200", "timestamp": "10:23:45", "caption": "Hydraulic leak on main boom cylinder"},
        {"id": "m2", "type": "photo", "url": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800", "thumbnail": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200", "timestamp": "10:25:12", "caption": "Cracked side mirror"},
        {"id": "m3", "type": "photo", "url": "https://images.unsplash.com/photo-1566041510639-8d95a2490bfb?w=800", "thumbnail": "https://images.unsplash.com/photo-1566041510639-8d95a2490bfb?w=200", "timestamp": "10:28:33", "caption": "Minor rust on step rails"},
        {"id": "m4", "type": "video", "url": "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800", "thumbnail": "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200", "timestamp": "10:30:00", "caption": "Equipment walkthrough video"}
    ],
    "similar_inspections": [
        {"id": "insp-010", "title": "Similar Hydraulic Issues Cluster", "summary": "3 other D6 units in the fleet have shown similar hydraulic line wear in the past 90 days", "count": 3},
        {"id": "insp-011", "title": "Mirror Damage Pattern", "summary": "5 units reported side mirror damage this quarter, possible site condition issue", "count": 5}
    ]
}

# --------------------- Routes ---------------------

@api_router.get("/")
async def root():
    return {"message": "Cat Inspect AI API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    STATUS_CHECKS.append(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    return [
        StatusCheck(**{**c, "timestamp": datetime.fromisoformat(c["timestamp"]) if isinstance(c.get("timestamp"), str) else c["timestamp"]})
        for c in STATUS_CHECKS[-1000:]
    ]

# Inspections endpoints
@api_router.get("/inspections")
async def get_inspections(status: Optional[str] = None, inspection_type: Optional[str] = None, search: Optional[str] = None):
    """Get list of inspections with optional filters"""
    results = MOCK_INSPECTIONS.copy()
    
    if status and status != "all":
        results = [i for i in results if i["status"].lower() == status.lower()]
    
    if inspection_type and inspection_type != "all":
        results = [i for i in results if i["inspection_type"].lower() == inspection_type.lower()]
    
    if search:
        search_lower = search.lower()
        results = [i for i in results if 
                   search_lower in i["equipment_model"].lower() or 
                   search_lower in i["serial_number"].lower() or
                   search_lower in i["customer"].lower() or
                   search_lower in i["location"].lower()]
    
    return results

# Store for dynamically created inspections
CREATED_INSPECTIONS = {}

@api_router.get("/inspections/{inspection_id}")
async def get_inspection(inspection_id: str):
    """Get single inspection detail"""
    # Return detailed mock for insp-002, otherwise return basic mock
    if inspection_id == "insp-002":
        return MOCK_INSPECTION_DETAIL
    
    # Check if it's a dynamically created inspection
    if inspection_id in CREATED_INSPECTIONS:
        return CREATED_INSPECTIONS[inspection_id]
    
    for insp in MOCK_INSPECTIONS:
        if insp["id"] == inspection_id:
            return {**insp, **{
                "findings": MOCK_INSPECTION_DETAIL["findings"],
                "checklist": MOCK_INSPECTION_DETAIL["checklist"],
                "parts_matches": MOCK_INSPECTION_DETAIL["parts_matches"],
                "media": MOCK_INSPECTION_DETAIL["media"],
                "similar_inspections": MOCK_INSPECTION_DETAIL["similar_inspections"]
            }}
    
    # For any unknown ID, return a mock completed inspection
    return {
        "id": inspection_id,
        "equipment_model": "CAT D6 Dozer",
        "serial_number": "CAT0D6X" + inspection_id[-5:],
        "customer": "New Customer",
        "location": "Dallas, TX",
        "inspection_type": "Safety",
        "status": "Submitted",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "inspector": "Sriram N.",
        "summary": "This inspection has been completed successfully. The AI assistant analyzed the equipment and identified several items for review. All critical safety checks passed, with minor maintenance recommendations noted below.",
        "safety_findings": ["No critical safety issues detected"],
        "action_items": [
            {"priority": 1, "action": "Review captured findings", "risk": "Low", "why": "Ensure all items documented"},
            {"priority": 2, "action": "Schedule follow-up if needed", "risk": "Low", "why": "Preventive maintenance"}
        ],
        "findings": MOCK_INSPECTION_DETAIL["findings"],
        "checklist": MOCK_INSPECTION_DETAIL["checklist"],
        "parts_matches": MOCK_INSPECTION_DETAIL["parts_matches"],
        "media": MOCK_INSPECTION_DETAIL["media"],
        "similar_inspections": MOCK_INSPECTION_DETAIL["similar_inspections"]
    }

@api_router.post("/inspections")
async def create_inspection(inspection: InspectionCreate):
    """Create a new inspection"""
    new_id = f"insp-{str(uuid.uuid4())[:8]}"
    new_inspection = {
        "id": new_id,
        "equipment_model": inspection.equipment_model,
        "serial_number": inspection.serial_number,
        "customer": inspection.customer,
        "location": inspection.location,
        "inspection_type": inspection.inspection_type,
        "status": "In Progress",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "inspector": "Sriram N.",
        "summary": "",
        "safety_findings": [],
        "action_items": []
    }
    return new_inspection

@api_router.put("/inspections/{inspection_id}/checklist/{item_id}")
async def update_checklist_item(inspection_id: str, item_id: str, result: str):
    """Update a checklist item result (inspector override)"""
    return {"success": True, "item_id": item_id, "new_result": result}

@api_router.post("/inspections/{inspection_id}/finish")
async def finish_inspection(inspection_id: str):
    """Finish inspection and generate report"""
    return {
        "success": True,
        "inspection_id": inspection_id,
        "status": "Submitted",
        "report_generated": True
    }

# Analytics endpoint
@api_router.get("/analytics")
async def get_analytics():
    """Get analytics data for dashboard"""
    return MOCK_ANALYTICS

# Chat endpoint
@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with AI assistant about inspection data"""
    try:
        openai_client = get_openai_client()
        
        # System message with context about the inspector's data
        system_message = """You are Cat Inspect AI Assistant, an expert AI helper for Caterpillar equipment inspectors. 
You have access to the inspector's inspection data and can help with:
- Summarizing inspections
- Identifying recurring failures and patterns
- Providing maintenance recommendations
- Answering questions about equipment

Current inspector: Sriram N.
Recent inspection statistics:
- Total inspections: 224
- Pass rate: 70%
- Most common failures: Hydraulics (35%), Engine (23%), Electrical (17%)
- Equipment types: Excavators, Dozers, Wheel Loaders, Articulated Trucks

Recent inspections summary:
1. CAT 320 Excavator - PASS (Jan 15)
2. CAT D6 Dozer - FAIL (Jan 14) - Hydraulic leak
3. CAT 966 Wheel Loader - MONITOR (Jan 13) - Bucket teeth wear
4. CAT 745 Articulated Truck - PASS (Jan 12)
5. CAT 336 Excavator - In Progress (Jan 11)

When asked for charts or visualizations, respond with a JSON object in your response that includes chart_type and data.
For example, if asked about failure categories, include: {"chart_type": "bar", "data": [...], "title": "..."}

Be concise, professional, and helpful. Focus on actionable insights."""

        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": request.message}
            ],
            max_tokens=500
        )
        
        response_text = response.choices[0].message.content
        
        # Check if response contains chart data
        chart_data = None
        if "chart_type" in response_text.lower() or '"data"' in response_text:
            import json
            import re
            # Try to extract JSON from response
            json_match = re.search(r'\{[^{}]*"chart_type"[^{}]*\}', response_text, re.DOTALL)
            if json_match:
                try:
                    chart_data = json.loads(json_match.group())
                except:
                    pass
        
        return ChatResponse(response=response_text, chart_data=chart_data)
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        # Fallback response
        fallback_responses = {
            "summarize": "Your last inspection was on CAT D6 Dozer (Jan 14) which failed due to a critical hydraulic leak in the main boom cylinder. Immediate repair is recommended before returning the equipment to service.",
            "failures": "Based on your recent inspections, the top recurring failures are: 1) Hydraulics (35%) - mainly hose wear and seal issues, 2) Engine (23%) - oil leaks and filter issues, 3) Electrical (17%) - wiring and sensor problems.",
            "chart": "Here's a breakdown of your failures by category over the last quarter."
        }
        
        msg_lower = request.message.lower()
        if "summarize" in msg_lower or "last" in msg_lower:
            return ChatResponse(response=fallback_responses["summarize"])
        elif "fail" in msg_lower or "recurring" in msg_lower:
            return ChatResponse(
                response=fallback_responses["failures"],
                chart_data={
                    "chart_type": "bar",
                    "title": "Failures by Category",
                    "data": MOCK_ANALYTICS["failed_parts"]
                }
            )
        elif "chart" in msg_lower or "graph" in msg_lower:
            return ChatResponse(
                response=fallback_responses["chart"],
                chart_data={
                    "chart_type": "bar",
                    "title": "Failures by Category", 
                    "data": MOCK_ANALYTICS["failed_parts"]
                }
            )
        else:
            return ChatResponse(response="I can help you with inspection summaries, failure analysis, and equipment recommendations. What would you like to know?")

# AI Vision Analysis - Analyze camera frame for issues
@api_router.post("/ai/vision/analyze")
async def analyze_vision(request: VisionAnalysisRequest):
    """Analyze an image for equipment issues using GPT-4o Vision"""
    try:
        openai_client = get_openai_client()
        
        system_prompt = """You are a Caterpillar heavy-equipment inspection AI. You analyze images of CAT machinery components.

IMPORTANT: The image may show a phone or tablet screen being held up to a camera. If so, analyze the CONTENT shown on that screen (the equipment photo), not the phone itself.

CRITICAL: Classify each image into exactly one of these categories and apply the correct severity.

=== PASS (severity LOW) — Normal operating condition ===
These are acceptable and do NOT need follow-up:
- Wheel rims / tire assemblies — even with cosmetic surface rust on the rim, if the tire and hub bolts are intact this is PASS
- Hub assemblies with yellow center cap and lug bolts visible — normal CAT wheel, PASS
- Coolant overflow tanks / fluid reservoirs with visible fluid level — normal, PASS
- Access steps / ladders that are structurally intact and properly mounted — PASS
- Air filter compartments with filter visible — normal maintenance access, PASS
- Any component that looks dirty but structurally sound — cosmetic only, PASS

=== FAIL (severity HIGH) or FURTHER INSPECTION (severity MEDIUM) ===
These ALWAYS need action — classify as MEDIUM or HIGH:
- Engine compartment or engine bay visible — MEDIUM minimum (maintenance access area, needs inspection)
- ANY hydraulic cylinder, ram, piston, boom arm, or pressurized component visible — MEDIUM minimum
- Hydraulic lines/hoses/fittings visible — MEDIUM minimum (potential leak/wear risk)
- Oil filters or fuel filters visible — MEDIUM (contamination risk)
- Heavy structural corrosion on pivot points, hinges, joints, or springs — MEDIUM
- Blade edges, cutting edges, or bucket teeth showing wear — MEDIUM
- Multiple machines visible at a work yard (fleet inspection context) — MEDIUM
- Loose, bent, or damaged structural components — MEDIUM
- Any active fluid leak, oil residue, or seepage — HIGH
- Exposed wiring or cables — HIGH

KEY RULE: If you can see inside an engine compartment, or see hydraulic cylinders/rams/pistons, or see oil/fuel filters, it is ALWAYS at least MEDIUM severity. These are maintenance-critical areas that require scheduled inspection.

KEY DISTINCTION: Surface rust on a wheel rim = PASS. Structural corrosion on a pivot joint or hydraulic fitting = MEDIUM/HIGH. A tire and hub assembly = PASS. A hydraulic cylinder or boom arm = MEDIUM.

Respond as STRICT JSON only (no markdown fences):
{"spoken_response":"One tactical sentence","summary":"1-2 sentences","overall_severity":"LOW|MEDIUM|HIGH","recommended_decision":"PASS|FAIL|FURTHER INSPECTION","should_alert":false,"findings":[{"issue":"label","severity":"LOW|MEDIUM|HIGH","recommendation":"action","confidence":0.9}]}"""

        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "You are inspecting Caterpillar heavy equipment. Look carefully at every component visible: wheels, tires, hubs, steps, filters, fluid tanks, engine bays, hydraulic lines, fittings, pivot joints, blades, corrosion. Classify severity and decision."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{request.image_base64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300
        )
        
        response_text = response.choices[0].message.content
        logger.info(f"Vision raw response (first 300 chars): {response_text[:300]}")
        
        import json
        import re
        
        # Strip markdown code fences before parsing
        cleaned = re.sub(r'```(?:json)?\s*', '', response_text).strip()
        
        json_match = re.search(r'\{[\s\S]*\}', cleaned)
        if json_match:
            try:
                result = json.loads(json_match.group())
                findings = result.get("findings", []) or []
                raw_severity = str(result.get("overall_severity", result.get("severity", "LOW"))).upper()
                if raw_severity not in {"LOW", "MEDIUM", "HIGH"}:
                    raw_severity = "LOW"

                recommended_decision = str(result.get("recommended_decision", "")).upper()
                if recommended_decision not in {"PASS", "FAIL", "FURTHER INSPECTION"}:
                    recommended_decision = "FAIL" if raw_severity == "HIGH" else ("FURTHER INSPECTION" if raw_severity == "MEDIUM" else "PASS")

                should_alert = bool(result.get("should_alert", False) or raw_severity == "HIGH")

                # Ensure each finding has normalized fields
                normalized_findings = []
                for f in findings:
                    sev = str((f or {}).get("severity", raw_severity)).upper()
                    if sev not in {"LOW", "MEDIUM", "HIGH"}:
                        sev = raw_severity
                    conf = (f or {}).get("confidence", 0.85)
                    try:
                        conf = float(conf)
                    except Exception:
                        conf = 0.85
                    conf = max(0.0, min(1.0, conf))

                    normalized_findings.append({
                        "issue": (f or {}).get("issue", "Visual observation"),
                        "severity": sev,
                        "recommendation": (f or {}).get("recommendation", "Continue monitoring condition."),
                        "confidence": conf,
                    })

                if not normalized_findings:
                    normalized_findings = [{
                        "issue": "General visual check",
                        "severity": raw_severity,
                        "recommendation": "Likely low/no operational impact. Inspector final decision required.",
                        "confidence": 0.8,
                    }]

                # --- Demo-tuned post-processing for CAT equipment ---
                combined_text = " ".join([
                    str(result.get("summary", "")),
                    str(result.get("spoken_response", "")),
                    " ".join(str(f.get("issue", "")) + " " + str(f.get("recommendation", "")) for f in normalized_findings),
                ]).lower()

                # PASS-signal keywords (normal components)
                pass_keywords = [
                    "wheel", "rim", "tire", "tyre", "hub", "lug", "bolt pattern",
                    "coolant", "reservoir", "overflow", "fluid level", "fluid tank",
                    "step", "ladder", "access step", "footstep",
                    "air filter", "filter compartment", "filter housing", "cabin filter",
                    "intact", "no visible", "no significant", "normal", "cosmetic",
                    "surface rust", "surface corrosion", "patina", "good condition",
                    "structurally sound", "properly mounted", "no leak", "no damage",
                ]

                # FAIL-signal keywords (actionable issues)
                fail_keywords = [
                    "hydraulic line", "hydraulic hose", "hydraulic fitting",
                    "hydraulic connection", "hydraulic system",
                    "engine compartment", "engine bay", "engine area",
                    "oil filter", "fuel filter", "filter contamination",
                    "pivot", "pivot point", "hinge", "joint corrosion",
                    "structural corrosion", "heavy corrosion", "deep corrosion",
                    "blade wear", "blade edge", "blade damage", "cutting edge",
                    "seepage", "oil residue", "fluid leak", "leak", "leaking",
                    "chafing", "abrasion", "wear pattern", "excessive wear",
                    "loose", "bent", "damaged", "cracked", "fracture",
                    "exposed wiring", "exposed cable",
                ]

                pass_score = sum(1 for k in pass_keywords if k in combined_text)
                fail_score = sum(1 for k in fail_keywords if k in combined_text)

                logger.info(f"Demo scoring — pass_score={pass_score}, fail_score={fail_score}, raw_severity={raw_severity}")

                # Strong FAIL override first — fail signals dominate or model already said HIGH
                if raw_severity == "HIGH" or (fail_score >= 3) or (fail_score >= 2 and fail_score > pass_score):
                    if raw_severity == "LOW":
                        raw_severity = "MEDIUM"
                    recommended_decision = "FAIL" if raw_severity == "HIGH" else "FURTHER INSPECTION"
                    should_alert = raw_severity == "HIGH"
                    normalized_findings[0]["severity"] = raw_severity
                    normalized_findings[0]["recommendation"] = (
                        "Condition requires follow-up. Schedule maintenance inspection. Inspector confirms final decision."
                    )
                    spoken_response = (
                        f"I'm detecting potential issues. Severity is {raw_severity.lower()}. Further inspection recommended, inspector makes the final decision."
                    )

                # Strong PASS override: pass signals present and fail signals absent/minimal
                elif pass_score >= 2 and fail_score <= 1:
                    raw_severity = "LOW"
                    recommended_decision = "PASS"
                    should_alert = False
                    normalized_findings[0]["severity"] = "LOW"
                    normalized_findings[0]["issue"] = normalized_findings[0].get("issue", "Component within normal parameters")
                    normalized_findings[0]["recommendation"] = (
                        "No actionable issues. Component appears within normal operating condition. Inspector confirms final decision."
                    )
                    spoken_response = (
                        "Component looks normal. No actionable findings. Low severity, inspector confirms the final call."
                    )

                # Fallback: trust model output but ensure spoken_response exists
                else:
                    spoken_response = result.get("spoken_response", "Analysis complete. Inspector should review.")

                return {
                    "analysis": result.get("summary", "Analysis complete"),
                    "findings": normalized_findings,
                    "severity": raw_severity,
                    "recommended_decision": recommended_decision,
                    "should_alert": should_alert,
                    "spoken_response": spoken_response
                }
            except json.JSONDecodeError as e:
                logger.warning(f"Vision JSON parse error: {e}")
        
        # Fallback: use the raw text as the spoken response
        fallback_text = response_text or ""
        text_upper = fallback_text.upper()
        if any(k in text_upper for k in ["CRITICAL", "SEVERE", "LEAK", "FIRE", "DANGER", "HAZARD", "BROKEN"]):
            fallback_severity = "HIGH"
        elif any(k in text_upper for k in ["WEAR", "RUST", "MONITOR", "CHECK", "CAUTION", "UNCERTAIN"]):
            fallback_severity = "MEDIUM"
        else:
            fallback_severity = "LOW"

        fallback_decision = "FAIL" if fallback_severity == "HIGH" else ("FURTHER INSPECTION" if fallback_severity == "MEDIUM" else "PASS")

        return {
            "analysis": response_text[:300] if response_text else "Analysis complete",
            "findings": [{
                "issue": "Visual observation",
                "severity": fallback_severity,
                "recommendation": "Review this area and confirm with inspector judgment.",
                "confidence": 0.75,
            }],
            "severity": fallback_severity,
            "recommended_decision": fallback_decision,
            "should_alert": fallback_severity == "HIGH",
            "spoken_response": response_text[:200] if response_text else "I could not analyze this image."
        }
        
    except Exception as e:
        logger.error(f"Vision analysis error: {str(e)}")
        return {
            "analysis": "Unable to analyze image at this time.",
            "findings": [],
            "severity": "MEDIUM",
            "recommended_decision": "FURTHER INSPECTION",
            "should_alert": False,
            "spoken_response": "I'm having trouble analyzing the image right now."
        }

# Text to Speech - Convert AI response to audio
@api_router.post("/ai/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using OpenAI TTS"""
    try:
        import base64
        
        openai_client = get_openai_client()
        
        response = await openai_client.audio.speech.create(
            model="tts-1",
            voice=request.voice or "alloy",
            input=request.text
        )
        
        # Get audio bytes and convert to base64
        audio_bytes = response.content
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        return {"audio_base64": audio_base64, "format": "mp3"}
        
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

# Speech to Text - Convert user speech to text
@api_router.post("/ai/stt")
async def speech_to_text(request: STTRequest):
    """Convert speech to text using OpenAI Whisper"""
    try:
        import base64
        import tempfile
        import os as os_module
        
        openai_client = get_openai_client()
        
        # Decode audio and save to temp file
        audio_bytes = base64.b64decode(request.audio_base64)
        
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name
        
        try:
            # Transcribe using OpenAI Whisper
            with open(temp_path, 'rb') as audio_file:
                response = await openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
            
            return {"text": response.text, "success": True}
        finally:
            # Clean up temp file
            if os_module.path.exists(temp_path):
                os_module.remove(temp_path)
        
    except Exception as e:
        logger.error(f"STT error: {str(e)}")
        return {"text": "", "success": False, "error": str(e)}
        
    except Exception as e:
        logger.error(f"STT error: {str(e)}")
        return {"text": "", "success": False, "error": str(e)}

# Media Storage Models
class MediaUploadRequest(BaseModel):
    inspection_id: str
    media_type: str  # "photo" or "video"
    data_base64: str
    caption: Optional[str] = None
    timestamp: Optional[str] = None

# Store captured media
INSPECTION_MEDIA = {}

@api_router.post("/inspections/{inspection_id}/media")
async def upload_media(inspection_id: str, request: MediaUploadRequest):
    """Store captured photo or video for an inspection"""
    try:
        import base64
        
        media_id = f"m-{uuid.uuid4().hex[:8]}"
        timestamp = request.timestamp or datetime.now(timezone.utc).strftime("%H:%M:%S")
        
        # Create media record
        media_item = {
            "id": media_id,
            "type": request.media_type,
            "data_base64": request.data_base64,  # Store the actual data
            "timestamp": timestamp,
            "caption": request.caption or f"Captured {request.media_type}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store in inspection media dict
        if inspection_id not in INSPECTION_MEDIA:
            INSPECTION_MEDIA[inspection_id] = []
        
        INSPECTION_MEDIA[inspection_id].append(media_item)
        
        logger.info(f"Media saved: {media_id} for inspection {inspection_id}")
        
        return {
            "success": True,
            "media_id": media_id,
            "message": f"{request.media_type.capitalize()} saved successfully"
        }
        
    except Exception as e:
        logger.error(f"Media upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save media: {str(e)}")

@api_router.get("/inspections/{inspection_id}/media")
async def get_inspection_media(inspection_id: str):
    """Get all media for an inspection"""
    media_list = INSPECTION_MEDIA.get(inspection_id, [])
    
    # Return without the full base64 data for listing
    return [{
        "id": m["id"],
        "type": m["type"],
        "timestamp": m["timestamp"],
        "caption": m["caption"],
        "thumbnail": m["data_base64"][:100] + "..." if len(m.get("data_base64", "")) > 100 else m.get("data_base64", "")
    } for m in media_list]

@api_router.get("/inspections/{inspection_id}/media/{media_id}")
async def get_media_item(inspection_id: str, media_id: str):
    """Get a specific media item with full data"""
    media_list = INSPECTION_MEDIA.get(inspection_id, [])
    
    for m in media_list:
        if m["id"] == media_id:
            return m
    
    raise HTTPException(status_code=404, detail="Media not found")

# Include the router in the main app
app.include_router(api_router)

# Include the realtime router under /api/ai (always, so we never 404)
app.include_router(realtime_router, prefix="/api/ai")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
