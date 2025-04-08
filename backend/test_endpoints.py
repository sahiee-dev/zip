import requests
import json

# Base URL for API endpoints
BASE_URL = "http://localhost:5001/api"

def test_users_endpoint():
    print("\nTesting GET /api/users endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/users")
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Response data:", response.json())
        else:
            print("Error response:", response.text)
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure the Flask server is running on port 5001")

def test_voice_command_endpoint():
    print("\nTesting POST /api/voice-command endpoint...")
    try:
        data = {
            "command": "check my emails",
            "username": "testuser"
        }
        response = requests.post(f"{BASE_URL}/voice-command", json=data)
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Response data:", response.json())
        else:
            print("Error response:", response.text)
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure the Flask server is running on port 5001")

def test_emails_endpoint():
    print("\nTesting GET /api/emails endpoint...")
    try:
        params = {"username": "testuser"}
        response = requests.get(f"{BASE_URL}/emails", params=params)
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Response data:", response.json())
        else:
            print("Error response:", response.text)
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure the Flask server is running on port 5001")

def test_process_voice_command_endpoint():
    print("\nTesting POST /api/process-voice-command endpoint...")
    try:
        data = {"command": "show me my unread emails"}
        response = requests.post(f"{BASE_URL}/process-voice-command", json=data)
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Response data:", response.json())
        else:
            print("Error response:", response.text)
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure the Flask server is running on port 5001")

def test_send_email_endpoint():
    print("\nTesting POST /api/send-email endpoint...")
    try:
        data = {
            "from": "testuser",
            "to": "recipient@example.com",
            "subject": "Test Email",
            "body": "This is a test email sent from the API test script."
        }
        response = requests.post(f"{BASE_URL}/send-email", json=data)
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Response data:", response.json())
        else:
            print("Error response:", response.text)
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure the Flask server is running on port 5001")

def test_check_voice_processing_endpoint():
    print("\nTesting GET /api/check-voice-processing endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/check-voice-processing")
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Response data:", response.json())
        else:
            print("Error response:", response.text)
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure the Flask server is running on port 5001")

if __name__ == "__main__":
    print("Running API endpoint tests...")
    print(f"Using base URL: {BASE_URL}")
    
    test_users_endpoint()
    test_voice_command_endpoint()
    test_emails_endpoint()
    test_process_voice_command_endpoint()
    test_send_email_endpoint()
    test_check_voice_processing_endpoint()
    
    print("\nAll tests completed.") 