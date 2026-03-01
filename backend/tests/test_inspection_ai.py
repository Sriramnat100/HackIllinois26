import asyncio
import json
import os
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from inspection_ai import (  # noqa: E402
    VisionAnalysisError,
    analyze_image,
    build_report,
    make_observation,
    merge_findings,
    normalize_analysis,
)


def raw(findings, overall="LOW", quality="good"):
    return {
        "image_quality": quality, "equipment": "excavator", "summary": "test summary",
        "overall_severity": overall, "recommended_decision": "PASS", "spoken_response": "ok",
        "findings": findings,
    }


def finding(component="Boom cylinder", issue="Hydraulic leak", severity="HIGH", safety=True, conf=0.9):
    return {"component": component, "issue": issue, "severity": severity, "safety_risk": safety,
            "recommended_action": "Replace seal", "confidence": conf}


class FakeClient:
    def __init__(self, content=None, error=None):
        self.calls = []
        self.content, self.error = content, error
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=self.content))])


def test_overall_severity_never_below_worst_finding():
    result = normalize_analysis(raw([finding(severity="HIGH")], overall="LOW"))
    assert result["severity"] == "HIGH"
    assert result["recommended_decision"] == "FAIL"
    assert result["should_alert"] is True
    f = result["findings"][0]
    assert f["recommendation"] == "Replace seal" and f["component"] == "Boom cylinder"


def test_clean_frame_passes_without_alert():
    result = normalize_analysis(raw([finding(severity="LOW", safety=False)]))
    assert result["severity"] == "LOW"
    assert result["recommended_decision"] == "PASS"
    assert result["should_alert"] is False


def test_bad_values_are_cleaned_up():
    result = normalize_analysis(raw([{"severity": "weird", "confidence": "nope"}], overall="???"))
    f = result["findings"][0]
    assert f["severity"] == "MEDIUM" and f["confidence"] == 0.5
    assert result["severity"] == "MEDIUM"


def test_analyze_image_uses_structured_output_and_image():
    client = FakeClient(content=json.dumps(raw([finding(severity="MEDIUM", safety=False)], overall="MEDIUM")))
    result = asyncio.run(analyze_image(client, "gpt-4o-mini", "QUJD", "Safety CAT 320"))
    assert result["recommended_decision"] == "FURTHER INSPECTION"
    call = client.calls[0]
    assert call["response_format"]["type"] == "json_schema"
    image_part = call["messages"][1]["content"][1]
    assert image_part["image_url"]["url"] == "data:image/jpeg;base64,QUJD"
    assert "CAT 320" in call["messages"][1]["content"][0]["text"]


def test_analyze_image_raises_instead_of_inventing_a_result():
    with pytest.raises(VisionAnalysisError):
        asyncio.run(analyze_image(FakeClient(error=RuntimeError("quota")), "m", "QUJD"))
    with pytest.raises(VisionAnalysisError):
        asyncio.run(analyze_image(FakeClient(content="not json"), "m", "QUJD"))


def test_merge_findings_dedupes_across_frames():
    obs = [
        make_observation(normalize_analysis(raw([finding(severity="MEDIUM", conf=0.6)])), "webrtc"),
        make_observation(normalize_analysis(raw([finding(severity="HIGH", conf=0.8)])), "webrtc", "SNAP"),
        make_observation(normalize_analysis(raw([finding("Tire", "Sidewall cut", "MEDIUM")])), "webrtc"),
    ]
    merged = merge_findings(obs)
    assert len(merged) == 2
    assert merged[0]["component"] == "Boom cylinder"
    assert merged[0]["severity"] == "HIGH" and merged[0]["frames"] == 2 and merged[0]["confidence"] == 0.8
    assert merged[0]["snapshot_id"] == obs[1]["id"]


def test_report_from_observations():
    insp = {"equipment_model": "CAT 320 Excavator", "serial_number": "SN1", "inspection_type": "Safety"}
    obs = [
        make_observation(normalize_analysis(raw([finding()])), "webrtc", "SNAP"),
        make_observation(normalize_analysis(raw([finding("Bucket", "Worn teeth", "MEDIUM", False)])), "capture", "SNAP2"),
        make_observation(normalize_analysis(raw([])), "webrtc"),
    ]
    report = build_report(insp, obs, notes=["Checked in rain"],
                          manual_marks=[{"severity": "LOW", "issue": "Manual mark: PASS"}])
    assert report["status"] == "FAIL"
    assert report["frames_analyzed"] == 3
    assert [a["priority"] for a in report["action_items"]] == [1, 2]
    assert report["action_items"][0]["action"] == "Replace seal"
    assert report["safety_findings"] == ["Boom cylinder: Hydraulic leak (HIGH)"]
    assert [c["result"] for c in report["checklist"]] == ["FAIL", "MONITOR", "PASS"]
    assert len(report["media"]) == 2 and report["media"][0]["url"].startswith("data:image/jpeg;base64,")
    assert "Do not operate until fixed" in report["summary"] and "Checked in rain" in report["summary"]


def test_report_with_nothing_analyzed_does_not_claim_pass():
    report = build_report({"equipment_model": "CAT D6"}, [])
    assert report["status"] == "Submitted"
    assert report["findings"] == [] and report["action_items"] == []
    assert "No usable inspection media" in report["summary"]


def test_frames_without_equipment_do_not_count_as_pass():
    blank = make_observation(normalize_analysis(raw([], quality="no_equipment")), "webrtc")
    report = build_report({"equipment_model": "CAT D6"}, [blank, blank])
    assert report["status"] == "Submitted"
    assert report["usable_frames"] == 0 and report["frames_analyzed"] == 2
    assert "2 frame(s) were too dark, blurry, or showed no equipment" in report["summary"]

    clean = make_observation(normalize_analysis(raw([])), "webrtc")
    assert build_report({"equipment_model": "CAT D6"}, [blank, clean])["status"] == "PASS"
