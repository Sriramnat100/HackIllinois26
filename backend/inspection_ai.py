"""
Inspection AI: OpenAI Vision analysis of inspection frames + maintenance report building.

- analyze_image(): one camera frame -> structured safety findings (severity, decision, actions)
- build_report(): all observations from a live inspection -> report fields used by the
  Inspection Detail page (summary, safety_findings, action_items, checklist, findings, media)
"""
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

SEVERITY_RANK = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}
DECISION_FOR_SEVERITY = {"LOW": "PASS", "MEDIUM": "FURTHER INSPECTION", "HIGH": "FAIL"}
CHECKLIST_RESULT_FOR_SEVERITY = {"LOW": "PASS", "MEDIUM": "MONITOR", "HIGH": "FAIL"}

VISION_SYSTEM_PROMPT = """You are a heavy-equipment safety inspector (Caterpillar excavators, dozers, loaders, haul trucks, generators) reviewing a frame from a live inspection camera.

Report only what you can actually see in the frame. Do not guess about parts that are not visible.
For every visible problem, give the component, what is wrong, a severity, whether it is a safety risk, and a concrete recommended action.

Severity:
- HIGH: immediate safety hazard or likely failure. Examples: active fluid leak, cracked or broken structure, damaged/chafed hydraulic hose, exposed or damaged wiring, missing guard or rail, damaged tire/track, broken light or mirror. The machine should not operate until fixed.
- MEDIUM: wear or damage that needs scheduled maintenance. Examples: heavy corrosion on structural parts, worn cutting edges or teeth, oil residue/seepage, loose or missing fasteners, worn bushings.
- LOW: cosmetic or monitor-only. Examples: dirt, paint wear, light surface rust.

recommended_decision: FAIL if any HIGH finding, FURTHER INSPECTION if any MEDIUM finding, otherwise PASS.
If the frame shows a phone/tablet screen with equipment on it, inspect the equipment shown on the screen.
If the frame is too dark, blurry, or shows no equipment, set image_quality to "unusable" or "no_equipment", return no findings, and say what the inspector should do (e.g. move closer, add light).
spoken_response: one short sentence an inspector could hear through a headset."""

VISION_SCHEMA = {
    "name": "inspection_frame_analysis",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["image_quality", "equipment", "summary", "overall_severity",
                     "recommended_decision", "spoken_response", "findings"],
        "properties": {
            "image_quality": {"type": "string", "enum": ["good", "unusable", "no_equipment"]},
            "equipment": {"type": "string", "description": "Machine or component in view, e.g. 'excavator boom cylinder'"},
            "summary": {"type": "string"},
            "overall_severity": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"]},
            "recommended_decision": {"type": "string", "enum": ["PASS", "FURTHER INSPECTION", "FAIL"]},
            "spoken_response": {"type": "string"},
            "findings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["component", "issue", "severity", "safety_risk",
                                 "recommended_action", "confidence"],
                    "properties": {
                        "component": {"type": "string"},
                        "issue": {"type": "string"},
                        "severity": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"]},
                        "safety_risk": {"type": "boolean"},
                        "recommended_action": {"type": "string"},
                        "confidence": {"type": "number"},
                    },
                },
            },
        },
    },
}


class VisionAnalysisError(Exception):
    """Raised when a frame could not be analyzed. Callers report it instead of inventing a result."""


def _clamp_confidence(value: Any) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.5


def normalize_analysis(raw: dict) -> dict:
    """Validate model output and add the fields the frontend already uses
    (analysis, severity, recommended_decision, should_alert, findings[].issue/recommendation)."""
    findings = []
    for f in raw.get("findings") or []:
        severity = str(f.get("severity", "LOW")).upper()
        if severity not in SEVERITY_RANK:
            severity = "MEDIUM"
        findings.append({
            "component": str(f.get("component") or "General").strip(),
            "issue": str(f.get("issue") or "Visual observation").strip(),
            "severity": severity,
            "safety_risk": bool(f.get("safety_risk")),
            "recommendation": str(f.get("recommended_action") or f.get("recommendation") or "Inspector to review.").strip(),
            "confidence": _clamp_confidence(f.get("confidence")),
        })

    # Overall severity can never be lower than the worst finding
    overall = str(raw.get("overall_severity", "LOW")).upper()
    if overall not in SEVERITY_RANK:
        overall = "LOW"
    worst = max((SEVERITY_RANK[f["severity"]] for f in findings), default=1)
    if worst > SEVERITY_RANK[overall]:
        overall = next(k for k, v in SEVERITY_RANK.items() if v == worst)

    # Decision follows severity so the two can never disagree
    decision = DECISION_FOR_SEVERITY[overall]

    return {
        "image_quality": raw.get("image_quality", "good"),
        "equipment": raw.get("equipment", ""),
        "analysis": raw.get("summary", ""),
        "findings": findings,
        "severity": overall,
        "recommended_decision": decision,
        "should_alert": overall == "HIGH" or any(f["safety_risk"] and f["severity"] != "LOW" for f in findings),
        "spoken_response": raw.get("spoken_response") or raw.get("summary", ""),
    }


async def analyze_image(client, model: str, image_base64: str, context: Optional[str] = None) -> dict:
    """Send one JPEG (base64) to OpenAI Vision and return normalized safety findings."""
    prompt = "Inspect this frame for equipment damage and safety issues."
    if context:
        prompt += f" Inspection context: {context}"
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": VISION_SYSTEM_PROMPT},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}", "detail": "high"}},
                ]},
            ],
            response_format={"type": "json_schema", "json_schema": VISION_SCHEMA},
            max_tokens=800,
        )
        content = response.choices[0].message.content or ""
        return normalize_analysis(json.loads(content))
    except Exception as e:  # network, auth, refusal, bad JSON
        logger.error(f"Vision analysis failed: {e}")
        raise VisionAnalysisError(str(e)) from e


# --------------------- Observations & reports ---------------------

def make_observation(result: dict, source: str, snapshot_base64: Optional[str] = None) -> dict:
    """One analyzed frame, as stored on the inspection."""
    return {
        "id": f"obs-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S"),
        "source": source,  # "webrtc" (auto), "capture" (manual), "upload"
        "result": result,
        "snapshot_base64": snapshot_base64,
    }


def _finding_key(f: dict) -> str:
    return f"{f.get('component', '').strip().lower()}|{f.get('issue', '').strip().lower()}"


def merge_findings(observations: list) -> list:
    """Collapse repeated findings across frames, keeping the worst severity and best confidence."""
    merged: dict[str, dict] = {}
    for obs in observations:
        for f in obs["result"].get("findings", []):
            key = _finding_key(f)
            if key not in merged:
                merged[key] = {**f, "first_seen": obs["timestamp"], "frames": 0, "snapshot_id": None}
            m = merged[key]
            m["frames"] += 1
            if SEVERITY_RANK[f["severity"]] > SEVERITY_RANK[m["severity"]]:
                m.update(severity=f["severity"], recommendation=f["recommendation"])
            m["confidence"] = max(m["confidence"], f["confidence"])
            m["safety_risk"] = m["safety_risk"] or f["safety_risk"]
            if not m["snapshot_id"] and obs.get("snapshot_base64"):
                m["snapshot_id"] = obs["id"]
    return sorted(merged.values(), key=lambda f: (-SEVERITY_RANK[f["severity"]], -f["confidence"]))


def build_report(inspection: dict, observations: list, notes: Optional[list] = None,
                 manual_marks: Optional[list] = None) -> dict:
    """Turn live-inspection observations into the report fields shown on the detail page."""
    notes = [n for n in (notes or []) if str(n).strip()]
    findings = merge_findings(observations)
    for mark in manual_marks or []:
        severity = str(mark.get("severity", "MEDIUM")).upper()
        findings.append({
            "component": mark.get("component") or "Inspector check",
            "issue": mark.get("issue") or "Marked by inspector",
            "severity": severity if severity in SEVERITY_RANK else "MEDIUM",
            "safety_risk": severity == "HIGH",
            "recommendation": mark.get("recommendation") or "Inspector to follow up.",
            "confidence": 1.0, "first_seen": mark.get("timestamp", ""), "frames": 0, "snapshot_id": None,
        })

    # Dark/blurry frames or frames without equipment can't support a PASS
    usable = [o for o in observations if o["result"].get("image_quality", "good") == "good"]
    actionable = [f for f in findings if f["severity"] != "LOW"]
    if any(f["severity"] == "HIGH" for f in findings):
        status = "FAIL"
    elif actionable:
        status = "MONITOR"
    elif usable or manual_marks:
        status = "PASS"
    else:
        status = "Submitted"  # nothing usable was analyzed - don't claim a PASS

    risk_label = {"HIGH": "High", "MEDIUM": "Medium", "LOW": "Low"}
    action_items = [{
        "priority": 1 if f["severity"] == "HIGH" else 2,
        "action": f["recommendation"],
        "why": f"{f['component']}: {f['issue']}",
        "risk": risk_label[f["severity"]] + (" (safety)" if f["safety_risk"] else ""),
    } for f in actionable]

    safety_findings = [
        f"{f['component']}: {f['issue']} ({f['severity']})"
        for f in findings if f["safety_risk"] or f["severity"] == "HIGH"
    ]

    checklist = [{
        "id": f"chk-{i + 1}",
        "category": f["component"],
        "item": f["issue"],
        "result": CHECKLIST_RESULT_FOR_SEVERITY[f["severity"]],
        "severity": f["severity"],
        "evidence": (f"Seen in {f['frames']} analyzed frame(s), first at {f['first_seen']} UTC"
                     if f["frames"] else "Marked by inspector"),
        "recommended_action": f["recommendation"],
        "confidence": round(f["confidence"], 2),
    } for i, f in enumerate(findings)]

    report_findings = [{
        "id": f"f-{i + 1}",
        "timestamp": f["first_seen"],
        "severity": f["severity"],
        "title": f"{f['component']}: {f['issue']}",
        "recommendation": f["recommendation"],
        "confidence": round(f["confidence"], 2),
        "category": f["component"],
    } for i, f in enumerate(findings)]

    media = [{
        "id": obs["id"],
        "type": "photo",
        "url": f"data:image/jpeg;base64,{obs['snapshot_base64']}",
        "timestamp": obs["timestamp"],
        "caption": (obs["result"].get("findings") or [{}])[0].get("issue")
                   or obs["result"].get("equipment") or "Inspection frame",
    } for obs in observations if obs.get("snapshot_base64")]

    return {
        "status": status,
        "findings": report_findings,
        "checklist": checklist,
        "action_items": action_items,
        "safety_findings": safety_findings,
        "media": media,
        "inspector_notes": notes,
        "frames_analyzed": len(observations),
        "usable_frames": len(usable),
        "summary": factual_summary(inspection, findings, len(observations), len(usable), notes),
    }


def factual_summary(inspection: dict, findings: list, frames: int, usable: int, notes: list) -> str:
    """Plain summary built only from recorded data (used when the LLM summary is unavailable)."""
    equipment = inspection.get("equipment_model", "equipment")
    serial = inspection.get("serial_number")
    counts = {s: sum(1 for f in findings if f["severity"] == s) for s in ("HIGH", "MEDIUM", "LOW")}
    if not usable and not findings:
        return (f"No usable inspection media was analyzed for the {equipment}"
                + (f" (serial {serial})" if serial else "")
                + (f"; {frames} frame(s) were too dark, blurry, or showed no equipment" if frames else "")
                + ". Re-run the live inspection with the camera pointed at the machine.")
    parts = [f"{inspection.get('inspection_type', 'Inspection')} of the {equipment}"
             + (f" (serial {serial})" if serial else "")
             + f": {usable} of {frames} camera frame(s) usable, {len(findings)} distinct finding(s) "
             + f"({counts['HIGH']} high, {counts['MEDIUM']} medium, {counts['LOW']} low)."]
    high = [f for f in findings if f["severity"] == "HIGH"]
    if high:
        parts.append("Do not operate until fixed: " + "; ".join(f"{f['component']} - {f['issue']}" for f in high) + ".")
    medium = [f for f in findings if f["severity"] == "MEDIUM"]
    if medium:
        parts.append("Schedule maintenance: " + "; ".join(f"{f['component']} - {f['issue']}" for f in medium) + ".")
    if notes:
        parts.append(f"Inspector notes: {' | '.join(notes)}")
    return " ".join(parts)


async def write_summary(client, model: str, inspection: dict, report: dict) -> str:
    """Ask the model for a short maintenance summary grounded in the recorded findings only."""
    payload = {
        "equipment": inspection.get("equipment_model"),
        "serial": inspection.get("serial_number"),
        "inspection_type": inspection.get("inspection_type"),
        "status": report["status"],
        "frames_analyzed": report["frames_analyzed"],
        "usable_frames": report["usable_frames"],
        "findings": [{k: c[k] for k in ("category", "item", "severity", "recommended_action")} for c in report["checklist"]],
        "inspector_notes": report["inspector_notes"],
    }
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": (
                "Write a 3-5 sentence maintenance summary for an equipment inspection report. "
                "Use only the data given; do not invent findings, parts, measurements, or conclusions. "
                "Lead with the overall result and any HIGH-severity (do-not-operate) issues, then MEDIUM items to schedule. "
                "If there are no findings, say no issues were seen in the usable frames and do not recommend repairs. "
                "Plain text, no markdown.")},
            {"role": "user", "content": json.dumps(payload)},
        ],
        max_tokens=300,
    )
    return (response.choices[0].message.content or "").strip()
