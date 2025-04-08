# Email Voice Assistant Application

This application allows you to manage your email accounts using facial authentication and voice commands.

## Prerequisites

- Python 3.8 or higher
- Node.js 14.0 or higher
- npm (Node Package Manager)
- A webcam for facial authentication
- A microphone for voice commands

## Quick Start

1. For Windows users:
   - Double-click `run_backend.bat` to start the backend server
     (This will create a virtual environment and install dependencies)
   - Double-click `run_frontend.bat` to start the frontend server
   - Open your browser and navigate to http://localhost:5173

2. For macOS/Linux users:
   - Open Terminal
   - Make the scripts executable:
     ```
     chmod +x run_backend.sh run_frontend.sh
     ```
   - Run the backend:
     ```
     ./run_backend.sh
     ```
     (This will create a virtual environment and install dependencies)
   - In a new terminal window, run the frontend:
     ```
     ./run_frontend.sh
     ```
   - Open your browser and navigate to http://localhost:5173

3. For manual setup:
   - Follow the instructions in `backend/README.txt`
   - Follow the instructions in `frontend/README.txt`

## Features

- Facial Authentication
- Voice-controlled Email Management
- Dark/Light Theme Support
- Multiple Email Account Support
- Secure Credential Storage

## Support

If you encounter any issues, please check the troubleshooting guides in the respective README files in the frontend and backend directories. 