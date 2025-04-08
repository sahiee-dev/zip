import requests
import sys

def test_server_connection():
    print("Testing connection to the backend server...")
    try:
        response = requests.get('http://localhost:5001/api/users', timeout=5)
        if response.status_code == 200:
            print(f"✅ Connection successful! Response: {response.json()}")
            return True
        else:
            print(f"❌ Server responded with status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Connection error: Could not connect to the server. Is it running?")
        return False
    except requests.exceptions.Timeout:
        print("❌ Timeout: Server took too long to respond.")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    if test_server_connection():
        print("\nThe server is running and responding correctly!")
        sys.exit(0)
    else:
        print("\nThe server test failed. Try these troubleshooting steps:")
        print("1. Make sure the Flask server is running with 'python app.py'")
        print("2. Check for any error messages in the server terminal")
        print("3. Verify the server is running on port 5001")
        print("4. Check if CORS is properly configured in app.py")
        print("5. Restart the server and try again")
        sys.exit(1) 