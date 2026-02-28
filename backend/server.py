from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone
from openai import AsyncOpenAI
from emergentintegrations.llm.openai import OpenAIChatRealtime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI client - use OPENAI_API_KEY if provided, otherwise fall back to EMERGENT_LLM_KEY
def get_openai_client():
    api_key = os.environ.get('OPENAI_API_KEY') or os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise ValueError("No API key configured. Set OPENAI_API_KEY in .env")
    return AsyncOpenAI(api_key=api_key)

# Initialize OpenAI Realtime Chat for WebRTC
openai_api_key = os.environ.get('OPENAI_API_KEY') or os.environ.get('EMERGENT_LLM_KEY')
realtime_chat = OpenAIChatRealtime(api_key=openai_api_key) if openai_api_key else None

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Create a router for realtime API and register OpenAI Realtime routes
realtime_router = APIRouter()
if realtime_chat:
    OpenAIChatRealtime.register_openai_realtime_router(realtime_router, realtime_chat)

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
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

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
        
        system_prompt = """You are an expert Caterpillar equipment inspector AI assistant. 
Analyze the image and identify any issues, defects, or safety concerns.

Look for:
- Hydraulic leaks (fluid stains, wet areas, drips)
- Rust and corrosion (orange/brown discoloration, surface pitting)
- Physical damage (dents, cracks, broken parts)
- Wear patterns (worn surfaces, thin materials, degradation)
- Safety hazards (loose parts, missing guards, exposed wiring)
- Part identification (identify visible components)

Respond in this JSON format:
{
    "summary": "Brief 1-2 sentence summary of what you see",
    "findings": [
        {"issue": "description", "severity": "HIGH/MEDIUM/LOW", "location": "where on equipment", "recommendation": "what to do"}
    ],
    "overall_severity": "HIGH/MEDIUM/LOW/NONE",
    "should_alert": true/false (true if HIGH severity found),
    "spoken_response": "A natural spoken sentence to tell the inspector what you found (keep it brief and actionable)"
}

If you don't see any clear issues, still provide a brief assessment.
Be concise but thorough. Focus on actionable findings."""

        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this equipment image for any issues or concerns:"},
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
            max_tokens=1000
        )
        
        response_text = response.choices[0].message.content
        
        # Parse JSON response
        import json
        import re
        
        # Try to extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                result = json.loads(json_match.group())
                return {
                    "analysis": result.get("summary", "Analysis complete"),
                    "findings": result.get("findings", []),
                    "severity": result.get("overall_severity", "NONE"),
                    "should_alert": result.get("should_alert", False),
                    "spoken_response": result.get("spoken_response", "I've completed my analysis.")
                }
            except json.JSONDecodeError:
                pass
        
        # Fallback if JSON parsing fails
        return {
            "analysis": response_text[:200] if response_text else "Analysis complete",
            "findings": [],
            "severity": "NONE",
            "should_alert": False,
            "spoken_response": "I've analyzed the image but couldn't identify specific issues."
        }
        
    except Exception as e:
        logger.error(f"Vision analysis error: {str(e)}")
        return {
            "analysis": "Unable to analyze image at this time.",
            "findings": [],
            "severity": "NONE", 
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

# Include the realtime router under /api/ai
if realtime_chat:
    app.include_router(realtime_router, prefix="/api/ai")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
