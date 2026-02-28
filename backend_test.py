#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class CatInspectAPITester:
    def __init__(self, base_url="https://cat-realtime-check.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_get_inspections(self):
        """Test getting all inspections"""
        return self.run_test("Get All Inspections", "GET", "inspections", 200)

    def test_get_inspections_with_filters(self):
        """Test inspections with filters"""
        # Test status filter
        success1, _ = self.run_test("Filter by Status (PASS)", "GET", "inspections", 200, params={"status": "pass"})
        
        # Test type filter
        success2, _ = self.run_test("Filter by Type (Safety)", "GET", "inspections", 200, params={"inspection_type": "safety"})
        
        # Test search
        success3, _ = self.run_test("Search Inspections", "GET", "inspections", 200, params={"search": "CAT"})
        
        return success1 and success2 and success3

    def test_get_single_inspection(self):
        """Test getting single inspection"""
        # Test with detailed mock (insp-002)
        success1, _ = self.run_test("Get Detailed Inspection", "GET", "inspections/insp-002", 200)
        
        # Test with basic mock (insp-001)
        success2, _ = self.run_test("Get Basic Inspection", "GET", "inspections/insp-001", 200)
        
        # Test non-existent inspection
        success3, _ = self.run_test("Get Non-existent Inspection", "GET", "inspections/non-existent", 404)
        
        return success1 and success2 and success3

    def test_create_inspection(self):
        """Test creating new inspection"""
        inspection_data = {
            "equipment_model": "CAT 320 Excavator",
            "serial_number": "CAT0320X12345",
            "customer": "Test Customer",
            "location": "Test Location",
            "inspection_type": "Daily Walkaround"
        }
        return self.run_test("Create New Inspection", "POST", "inspections", 200, data=inspection_data)

    def test_update_checklist_item(self):
        """Test updating checklist item"""
        return self.run_test("Update Checklist Item", "PUT", "inspections/insp-002/checklist/c1", 200, params={"result": "PASS"})

    def test_finish_inspection(self):
        """Test finishing inspection"""
        return self.run_test("Finish Inspection", "POST", "inspections/insp-002/finish", 200)

    def test_get_analytics(self):
        """Test analytics endpoint"""
        return self.run_test("Get Analytics Data", "GET", "analytics", 200)

    def test_chat_endpoint(self):
        """Test chat endpoint"""
        chat_data = {
            "message": "Summarize my last inspection",
            "session_id": "test-session"
        }
        return self.run_test("Chat with AI", "POST", "chat", 200, data=chat_data)

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Create status check
        status_data = {"client_name": "test_client"}
        success1, response = self.run_test("Create Status Check", "POST", "status", 200, data=status_data)
        
        # Get status checks
        success2, _ = self.run_test("Get Status Checks", "GET", "status", 200)
        
        return success1 and success2

    def test_inspection_dynamic_ids(self):
        """Test inspection endpoint with dynamic IDs (bug fix verification)"""
        # Test with various dynamic IDs to verify the bug fix
        test_ids = ["insp-002", "insp-001", "random-id-123", "new-inspection-456"]
        
        all_success = True
        for test_id in test_ids:
            success, response = self.run_test(f"Get Inspection {test_id}", "GET", f"inspections/{test_id}", 200)
            if success and response:
                # Verify response has required fields
                required_fields = ["id", "equipment_model", "status", "date", "inspector"]
                missing_fields = [field for field in required_fields if field not in response]
                if missing_fields:
                    print(f"   ⚠️  Missing fields: {missing_fields}")
                    all_success = False
                else:
                    print(f"   ✅ Response contains all required fields")
            else:
                all_success = False
        
        return all_success

    def test_ai_tts_endpoint(self):
        """Test Text-to-Speech AI endpoint"""
        tts_data = {
            "text": "This is a test of the text to speech functionality",
            "voice": "alloy"
        }
        success, response = self.run_test("AI Text-to-Speech", "POST", "ai/tts", 200, data=tts_data)
        
        if success and response:
            # Verify response has audio_base64 field
            if "audio_base64" in response and response["audio_base64"]:
                print(f"   ✅ TTS returned audio data (length: {len(response['audio_base64'])} chars)")
                return True
            else:
                print(f"   ❌ TTS response missing audio_base64 field")
                return False
        return success

    def test_ai_vision_endpoint(self):
        """Test AI Vision Analysis endpoint"""
        # Create a simple base64 test image (1x1 pixel PNG)
        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        vision_data = {
            "image_base64": test_image_b64,
            "context": "equipment inspection test"
        }
        success, response = self.run_test("AI Vision Analysis", "POST", "ai/vision/analyze", 200, data=vision_data)
        
        if success and response:
            # Verify response has required fields
            required_fields = ["analysis", "findings", "severity", "should_alert"]
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️  Missing fields: {missing_fields}")
                return False
            else:
                print(f"   ✅ Vision analysis response contains all required fields")
                return True
        return success

    def test_media_storage_endpoint(self):
        """Test media storage endpoint"""
        # Test with a sample inspection ID
        inspection_id = "insp-002"
        
        # Create test media data
        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        media_data = {
            "inspection_id": inspection_id,
            "media_type": "photo",
            "data_base64": test_image_b64,
            "caption": "Test photo capture",
            "timestamp": "10:30:00"
        }
        
        success, response = self.run_test("Store Media", "POST", f"inspections/{inspection_id}/media", 200, data=media_data)
        
        if success and response:
            # Verify response indicates success
            if response.get("success") and response.get("media_id"):
                print(f"   ✅ Media stored with ID: {response['media_id']}")
                
                # Test retrieving the media list
                success2, media_list = self.run_test("Get Media List", "GET", f"inspections/{inspection_id}/media", 200)
                if success2 and isinstance(media_list, list) and len(media_list) > 0:
                    print(f"   ✅ Media list retrieved ({len(media_list)} items)")
                    return True
                else:
                    print(f"   ❌ Failed to retrieve media list")
                    return False
            else:
                print(f"   ❌ Media storage response missing success/media_id")
                return False
        return success

    def test_ai_stt_endpoint(self):
        """Test Speech-to-Text AI endpoint (optional)"""
        # Create a minimal audio file in base64 (this is just a test, won't produce real transcription)
        test_audio_b64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
        
        stt_data = {
            "audio_base64": test_audio_b64
        }
        success, response = self.run_test("AI Speech-to-Text", "POST", "ai/stt", 200, data=stt_data)
        
        if success and response:
            # Check if response has expected structure
            if "text" in response and "success" in response:
                print(f"   ✅ STT endpoint responded correctly")
                return True
            else:
                print(f"   ⚠️  STT response missing expected fields")
                return False
        return success

def main():
    print("🚀 Starting Cat Inspect AI Backend API Tests")
    print("=" * 60)
    
    tester = CatInspectAPITester()
    
    # Run all tests
    test_results = []
    
    print("\n📋 Testing Core API Endpoints...")
    test_results.append(tester.test_root_endpoint())
    
    print("\n📊 Testing Inspections Endpoints...")
    test_results.append(tester.test_get_inspections())
    test_results.append(tester.test_get_inspections_with_filters())
    test_results.append(tester.test_get_single_inspection())
    test_results.append(tester.test_create_inspection())
    test_results.append(tester.test_update_checklist_item())
    test_results.append(tester.test_finish_inspection())
    
    print("\n📈 Testing Analytics Endpoint...")
    test_results.append(tester.test_get_analytics())
    
    print("\n🤖 Testing Chat Endpoint...")
    test_results.append(tester.test_chat_endpoint())
    
    print("\n🔍 Testing Status Endpoints...")
    test_results.append(tester.test_status_endpoints())
    
    print("\n🔧 Testing Bug Fixes & New Features...")
    test_results.append(tester.test_inspection_dynamic_ids())
    
    print("\n🤖 Testing AI Features...")
    test_results.append(tester.test_ai_tts_endpoint())
    test_results.append(tester.test_ai_vision_endpoint())
    test_results.append(tester.test_ai_stt_endpoint())
    
    print("\n📸 Testing Media Storage...")
    test_results.append(tester.test_media_storage_endpoint())
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 Test Results Summary:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {len(tester.failed_tests)}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            if 'error' in failure:
                print(f"   - {failure['test']}: {failure['error']}")
            else:
                print(f"   - {failure['test']}: Expected {failure.get('expected')}, got {failure.get('actual')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())