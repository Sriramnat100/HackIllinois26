"""
Backend API Tests for Cat Inspect AI - OpenAI Realtime API Integration
Tests the new realtime session and negotiate endpoints along with existing APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRealtimeAPI:
    """Tests for OpenAI Realtime API endpoints"""
    
    def test_realtime_session_endpoint(self):
        """POST /api/ai/realtime/session - should return session with client_secret"""
        response = requests.post(f"{BASE_URL}/api/ai/realtime/session")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify session structure
        assert "client_secret" in data, "Response should contain client_secret"
        assert "value" in data["client_secret"], "client_secret should have value"
        assert "expires_at" in data["client_secret"], "client_secret should have expires_at"
        
        # Verify ephemeral key format
        ephemeral_key = data["client_secret"]["value"]
        assert ephemeral_key.startswith("ek_"), f"Ephemeral key should start with 'ek_', got: {ephemeral_key[:10]}..."
        
        # Verify session metadata
        assert "model" in data, "Response should contain model"
        assert "gpt-4o-realtime" in data["model"], f"Model should be realtime model, got: {data['model']}"
        
        print(f"✓ Realtime session created successfully with model: {data['model']}")
        print(f"✓ Ephemeral key received: {ephemeral_key[:15]}...")
    
    def test_realtime_session_returns_valid_expiry(self):
        """Verify session expiry is in the future"""
        response = requests.post(f"{BASE_URL}/api/ai/realtime/session")
        
        assert response.status_code == 200
        data = response.json()
        
        expires_at = data["client_secret"]["expires_at"]
        assert isinstance(expires_at, int), "expires_at should be an integer timestamp"
        assert expires_at > 0, "expires_at should be a positive timestamp"
        
        print(f"✓ Session expires at timestamp: {expires_at}")


class TestExistingAPIs:
    """Tests for existing API endpoints to ensure they still work"""
    
    def test_root_endpoint(self):
        """GET /api/ - should return API message"""
        response = requests.get(f"{BASE_URL}/api/")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Cat Inspect AI API" in data["message"]
        
        print("✓ Root endpoint working")
    
    def test_get_inspections(self):
        """GET /api/inspections - should return list of inspections"""
        response = requests.get(f"{BASE_URL}/api/inspections")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        assert len(data) > 0, "Should have at least one inspection"
        
        # Verify inspection structure
        first_inspection = data[0]
        required_fields = ["id", "equipment_model", "serial_number", "customer", "status"]
        for field in required_fields:
            assert field in first_inspection, f"Inspection should have {field}"
        
        print(f"✓ GET /api/inspections returned {len(data)} inspections")
    
    def test_get_single_inspection(self):
        """GET /api/inspections/{id} - should return inspection detail"""
        response = requests.get(f"{BASE_URL}/api/inspections/insp-002")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "insp-002"
        assert "equipment_model" in data
        assert "findings" in data
        assert "checklist" in data
        
        print(f"✓ GET /api/inspections/insp-002 returned detailed inspection")
    
    def test_get_analytics(self):
        """GET /api/analytics - should return analytics data"""
        response = requests.get(f"{BASE_URL}/api/analytics")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "failed_parts" in data
        assert "inspections_over_time" in data
        assert "pass_fail_monitor" in data
        
        print("✓ GET /api/analytics returned analytics data")
    
    def test_chat_endpoint(self):
        """POST /api/chat - should return AI response"""
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json={"message": "Hello, summarize my last inspection"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "response" in data
        assert len(data["response"]) > 0, "Response should not be empty"
        
        print(f"✓ POST /api/chat returned response: {data['response'][:50]}...")
    
    def test_create_inspection(self):
        """POST /api/inspections - should create new inspection"""
        payload = {
            "equipment_model": "TEST CAT 320 Excavator",
            "serial_number": "TEST123456",
            "customer": "Test Customer",
            "location": "Test Location",
            "inspection_type": "Safety"
        }
        
        response = requests.post(f"{BASE_URL}/api/inspections", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["equipment_model"] == payload["equipment_model"]
        assert data["status"] == "In Progress"
        
        print(f"✓ POST /api/inspections created inspection: {data['id']}")
    
    def test_finish_inspection(self):
        """POST /api/inspections/{id}/finish - should finish inspection"""
        response = requests.post(f"{BASE_URL}/api/inspections/insp-002/finish")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["status"] == "Submitted"
        
        print("✓ POST /api/inspections/{id}/finish completed successfully")


class TestAIEndpoints:
    """Tests for AI-related endpoints"""
    
    def test_vision_analyze_endpoint_exists(self):
        """POST /api/ai/vision/analyze - should accept image analysis request"""
        # Send a minimal base64 image (1x1 pixel white PNG)
        minimal_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/ai/vision/analyze",
            json={"image_base64": minimal_image, "context": "test"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "analysis" in data
        assert "findings" in data
        assert "severity" in data
        
        print("✓ POST /api/ai/vision/analyze endpoint working")
    
    def test_tts_endpoint(self):
        """POST /api/ai/tts - should generate audio from text"""
        response = requests.post(
            f"{BASE_URL}/api/ai/tts",
            json={"text": "Hello inspector", "voice": "alloy"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "audio_base64" in data
        assert len(data["audio_base64"]) > 100, "Audio should have content"
        assert data["format"] == "mp3"
        
        print(f"✓ POST /api/ai/tts generated audio ({len(data['audio_base64'])} chars)")


class TestMediaEndpoints:
    """Tests for media upload/retrieval endpoints"""
    
    def test_upload_media(self):
        """POST /api/inspections/{id}/media - should save media"""
        minimal_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/inspections/insp-002/media",
            json={
                "inspection_id": "insp-002",
                "media_type": "photo",
                "data_base64": minimal_image,
                "caption": "Test photo"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "media_id" in data
        
        print(f"✓ POST /api/inspections/{{id}}/media saved media: {data['media_id']}")
    
    def test_get_inspection_media(self):
        """GET /api/inspections/{id}/media - should return media list"""
        response = requests.get(f"{BASE_URL}/api/inspections/insp-002/media")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        print(f"✓ GET /api/inspections/{{id}}/media returned {len(data)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
