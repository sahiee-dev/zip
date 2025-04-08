# Backend Setup Instructions

## Manual Setup

1. Install Python 3.8 or higher from https://www.python.org/downloads/

2. Install required packages:
   ```
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```
   python app.py
   ```

The server will run on http://localhost:5001

## Troubleshooting

1. Port Already in Use:
   - If port 5001 is already in use, you can change it in app.py
   - Look for the line: `app.run(host='0.0.0.0', port=5001, debug=True)`
   - Change the port number to an available port

2. Package Installation Issues:
   - Make sure you have pip installed and updated
   - Try running: `pip install --upgrade pip`
   - Then run: `pip install -r requirements.txt`

3. Webcam Access Issues:
   - Ensure your webcam is properly connected
   - Check if other applications can access your webcam
   - Make sure you've granted camera permissions to your browser

4. Database Issues:
   - If you encounter database errors, delete the following files:
     - users.pkl
     - email_accounts.pkl
   - Restart the application to create fresh database files

## Security Notes

- Keep your email credentials secure
- Don't share your facial recognition data
- The application stores credentials locally on your machine
- Make sure to log out when using shared computers 