from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import imaplib
import email
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import face_recognition
import cv2
import numpy as np
import speech_recognition as sr
import pyttsx3
import json
from dotenv import load_dotenv
import pickle
from datetime import datetime, timedelta
import os.path
import logging
import re
from email.header import decode_header
from gtts import gTTS
import io
import tempfile

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Simple CORS configuration
CORS(app)

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Store user email accounts
email_accounts = {}  # Will be converted to: {username: {email1: {details}, email2: {details}, ...}}

# Store face encodings
registered_faces = {}
FACE_DB_PATH = "face_encodings.pkl"
EMAIL_ACCOUNTS_PATH = "email_accounts.pkl"

# Load existing face encodings if available
if os.path.exists(FACE_DB_PATH):
    try:
        with open(FACE_DB_PATH, 'rb') as f:
            registered_faces = pickle.load(f)
        logger.info(f"Loaded {len(registered_faces)} registered faces")
    except Exception as e:
        logger.error(f"Error loading face encodings: {e}")

# Load existing email accounts if available
if os.path.exists(EMAIL_ACCOUNTS_PATH):
    try:
        with open(EMAIL_ACCOUNTS_PATH, 'rb') as f:
            email_accounts = pickle.load(f)
        logger.info(f"Loaded email accounts for {len(email_accounts)} users")
    except Exception as e:
        logger.error(f"Error loading email accounts: {e}")

# Speech recognition setup
recognizer = sr.Recognizer()

# Text-to-speech setup
engine = pyttsx3.init()

# Add a root endpoint for testing
@app.route('/', methods=['GET'])
def index():
    return jsonify({"status": "ok", "message": "Voice Email Assistant API is running"}), 200

@app.route('/api/accounts', methods=['GET', 'POST'])
def handle_accounts():
    if request.method == 'GET':
        username = request.args.get('username')
        if not username:
            logger.error("No username provided in get accounts request")
            return jsonify({"error": "Missing username parameter"}), 400
        
        # Initialize empty dict for this user if not exists
        if username not in email_accounts:
            email_accounts[username] = {}
        
        # Return list of accounts with their details
        accounts = []
        for email, account_data in email_accounts[username].items():
            accounts.append({
                'email': email,
                'isDefault': account_data.get('isDefault', False)
            })
        
        logger.info(f"Retrieved {len(accounts)} accounts for user: {username}")
        return jsonify({"accounts": accounts}), 200
    
    elif request.method == 'POST':
        data = request.json
        
        if not data or 'email' not in data or 'password' not in data or 'username' not in data:
            logger.error("Missing email, password or username in add account request")
            return jsonify({"error": "Missing email, password or username"}), 400
        
        email = data['email']
        password = data['password']
        username = data['username']
        
        # Initialize empty dict for this user if not exists
        if username not in email_accounts:
            email_accounts[username] = {}
        
        # Check if email is already registered for this user
        if email in email_accounts[username]:
            logger.warning(f"Email {email} already registered for user: {username}")
            return jsonify({"error": "Email account already registered for this user"}), 400
        
        try:
            # Test the email credentials
            if email.endswith('@gmail.com'):
                # For Gmail, use OAuth2 or App Password
                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(email, password)
                server.quit()
            else:
                # For other email providers
                server = smtplib.SMTP('smtp.office365.com', 587)
                server.starttls()
                server.login(email, password)
                server.quit()
            
            # Store the account credentials
            email_accounts[username][email] = {
                'password': password,
                'isDefault': len(email_accounts[username]) == 0  # First account is default
            }
            
            # Save updated email accounts
            try:
                with open(EMAIL_ACCOUNTS_PATH, 'wb') as f:
                    pickle.dump(email_accounts, f)
                logger.info(f"Saved email accounts to {EMAIL_ACCOUNTS_PATH}")
            except Exception as e:
                logger.error(f"Error saving email accounts: {e}")
                return jsonify({"error": "Failed to save account"}), 500
            
            logger.info(f"Added email account: {email} for user: {username}")
            return jsonify({"message": "Account added successfully"}), 201
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"Error adding account: {error_message}")
            
            if 'Authentication Required' in error_message:
                return jsonify({"error": "Authentication failed. Please check your email and password."}), 401
            elif 'Invalid credentials' in error_message:
                return jsonify({"error": "Invalid email or password."}), 401
            else:
                return jsonify({"error": f"Failed to add account: {error_message}"}), 500

@app.route('/api/check-account', methods=['POST'])
def check_account():
    """Check if an email account exists in the system"""
    data = request.json
    
    if not data or 'email' not in data or 'username' not in data:
        logger.error("Missing email or username in check account request")
        return jsonify({"error": "Missing email or username"}), 400
    
    user_email = data['email']
    username = data['username']
    
    # Check if user exists
    if username not in email_accounts:
        logger.info(f"User {username} not found")
        return jsonify({"exists": False}), 200
    
    # Check if email exists for this user
    exists = user_email in email_accounts[username]
    
    logger.info(f"Checked email account: {user_email} for user: {username}, exists: {exists}")
    return jsonify({"exists": exists}), 200

@app.route('/api/register-face', methods=['POST'])
def register_face():
    logger.info("Registration request received")
    
    if 'image' not in request.files:
        logger.error("No image file provided in request")
        return jsonify({"error": "Missing image file"}), 400
    
    if 'username' not in request.form:
        logger.error("No username provided in request")
        return jsonify({"error": "Missing username"}), 400
    
    image_file = request.files['image']
    username = request.form['username']
    
    logger.info(f"Processing registration for username: {username}")
    
    try:
        # Save temporary image file
        temp_path = "temp_register_image.jpg"
        image_file.save(temp_path)
        logger.info(f"Saved temporary image file to {temp_path}")
        
        # Load the image
        logger.info("Loading image with face_recognition library")
        image = face_recognition.load_image_file(temp_path)
        logger.info(f"Image loaded successfully, shape: {image.shape}")
        
        # Find all face locations in the image
        logger.info("Detecting faces in the image")
        face_locations = face_recognition.face_locations(image)
        logger.info(f"Number of faces detected: {len(face_locations)}")
        
        # If no faces found
        if len(face_locations) == 0:
            os.remove(temp_path)
            logger.warning("No faces detected in the image")
            return jsonify({"registered": False, "message": "No face detected"}), 200
        
        # If multiple faces found
        if len(face_locations) > 1:
            os.remove(temp_path)
            logger.warning(f"Multiple faces detected: {len(face_locations)}")
            return jsonify({"registered": False, "message": "Multiple faces detected. Please provide an image with only your face."}), 200
        
        # Get face encodings
        logger.info("Computing face encodings")
        face_encodings = face_recognition.face_encodings(image, face_locations)
        
        if len(face_encodings) == 0:
            os.remove(temp_path)
            logger.error("Failed to compute face encodings")
            return jsonify({"registered": False, "message": "Failed to process face. Please try again with better lighting."}), 200
        
        # Check if this face is already registered with another username
        logger.info("Checking if face is already registered")
        for registered_username, registered_encoding in registered_faces.items():
            if registered_username != username:  # Skip comparing with self
                matches = face_recognition.compare_faces([registered_encoding], face_encodings[0], tolerance=0.5)
                if matches[0]:
                    os.remove(temp_path)
                    logger.warning(f"Face already registered with username: {registered_username}")
                    return jsonify({"registered": False, "message": "This face is already registered with another user."}), 200
        
        # Store the face encoding for the username
        registered_faces[username] = face_encodings[0]
        logger.info(f"Face encoding stored for username: {username}")
        
        # Save updated face encodings
        with open(FACE_DB_PATH, 'wb') as f:
            pickle.dump(registered_faces, f)
        logger.info(f"Face encodings saved to {FACE_DB_PATH}")
        
        os.remove(temp_path)
        logger.info("Registration successful")
        return jsonify({"registered": True, "message": "Face registered successfully"}), 200
    
    except Exception as e:
        logger.error(f"Error in face registration: {str(e)}", exc_info=True)
        # Clean up temp file if it exists
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500

@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    
    try:
        # Save temporary audio file
        temp_path = "temp_audio.wav"
        audio_file.save(temp_path)
        
        # Convert speech to text
        with sr.AudioFile(temp_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            
        # Remove temporary file
        os.remove(temp_path)
        
        return jsonify({"text": text}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/send-email', methods=['POST'])
def send_email():
    data = request.json
    logger.info(f"Send email request received with data: {data}")
    
    if not data:
        logger.error("No data provided in send email request")
        return jsonify({"error": "No data provided"}), 400
        
    if 'from_email' not in data or 'to_email' not in data or 'subject' not in data or 'body' not in data or 'username' not in data:
        logger.error(f"Missing required email information: {data}")
        return jsonify({"error": "Missing required email information. Need from_email, to_email, subject, body, and username"}), 400
    
    from_email = data['from_email']
    username = data['username']
    
    # For debugging
    if username in email_accounts:
        logger.info(f"Current email accounts for user {username}: {list(email_accounts[username].keys())}")
    else:
        logger.error(f"User {username} not found")
        return jsonify({"error": f"User {username} not found. Please log in again."}), 404
    
    if from_email not in email_accounts[username]:
        logger.error(f"Sender email not found in accounts for user {username}: {from_email}")
        return jsonify({"error": f"Sender email {from_email} not found in accounts for user {username}. Please add the account first."}), 404
    
    account = email_accounts[username][from_email]
    password = account['password']
    to_email = data['to_email']
    subject = data['subject']
    body = data['body']
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to SMTP server (assuming Gmail)
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        
        logger.info(f"Attempting to login with email: {from_email}")
        server.login(from_email, password)
        
        # Send email
        logger.info(f"Sending email from {from_email} to {to_email}")
        server.send_message(msg)
        server.quit()
        
        logger.info("Email sent successfully")
        return jsonify({"message": "Email sent successfully"}), 200
    
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to send email: {str(e)}"}), 500

@app.route('/api/read-unread-emails', methods=['POST'])
def read_unread_emails():
    data = request.json
    logger.info(f"Read unread emails request received with data: {data}")
    
    if not data or 'email' not in data or 'username' not in data:
        logger.error("Missing email account or username information in read unread emails request")
        return jsonify({"error": "Missing email account or username information"}), 400
    
    user_email = data['email']
    username = data['username']
    
    # For debugging
    if username in email_accounts:
        logger.info(f"Current email accounts for user {username}: {list(email_accounts[username].keys())}")
    else:
        logger.error(f"User {username} not found")
        return jsonify({"error": f"User {username} not found. Please log in again."}), 404
    
    if user_email not in email_accounts[username]:
        logger.error(f"Email not found in accounts for user {username}: {user_email}")
        return jsonify({"error": f"Email {user_email} not found in accounts for user {username}. Please add the account first."}), 404
    
    account = email_accounts[username][user_email]
    password = account['password']
    
    try:
        # Determine email provider from domain
        email_domain = user_email.split('@')[1].lower()
        
        if 'gmail' in email_domain:
            imap_server = 'imap.gmail.com'
        elif 'yahoo' in email_domain:
            imap_server = 'imap.mail.yahoo.com'
        elif 'outlook' in email_domain or 'hotmail' in email_domain or 'live' in email_domain:
            imap_server = 'outlook.office365.com'
        else:
            # Default to Gmail
            imap_server = 'imap.gmail.com'
        
        logger.info(f"Using IMAP server {imap_server} for {user_email}")
            
        # Connect to IMAP server
        mail = imaplib.IMAP4_SSL(imap_server)
        
        logger.info(f"Attempting to login with email: {user_email}")
        mail.login(user_email, password)
        
        mail.select('inbox')
        
        # Search for ALL unread emails, not just from last 24 hours
        logger.info("Searching for unread emails")
        result, data = mail.search(None, 'UNSEEN')
        
        email_ids = data[0].split()
        emails = []
        
        logger.info(f"Found {len(email_ids)} unread emails")
        
        # Limit to most recent 20 emails to avoid overload
        # Reverse to get newest first
        email_ids = email_ids[-20:] if len(email_ids) > 20 else email_ids
        
        for e_id in email_ids:
            try:
                result, data = mail.fetch(e_id, '(RFC822)')
                raw_email = data[0][1]
                msg = email.message_from_bytes(raw_email)
                
                subject = decode_header(msg['subject'])
                subject = subject[0][0]
                if isinstance(subject, bytes):
                    subject = subject.decode('utf-8', errors='replace')
                
                from_addr = decode_header(msg['from'])
                from_addr = from_addr[0][0]
                if isinstance(from_addr, bytes):
                    from_addr = from_addr.decode('utf-8', errors='replace')
                
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        content_disposition = str(part.get("Content-Disposition"))
                        
                        if "attachment" not in content_disposition and (content_type == "text/plain" or content_type == "text/html"):
                            try:
                                payload = part.get_payload(decode=True)
                                if payload:
                                    charset = part.get_content_charset() or 'utf-8'
                                    body = payload.decode(charset, errors='replace')
                                    if content_type == "text/html":
                                        # Try to extract text from HTML
                                        body = re.sub('<[^<]+?>', ' ', body)
                                    break
                            except Exception as e:
                                logger.error(f"Error decoding email part: {str(e)}")
                                continue
                else:
                    try:
                        payload = msg.get_payload(decode=True)
                        if payload:
                            charset = msg.get_content_charset() or 'utf-8'
                            body = payload.decode(charset, errors='replace')
                    except Exception as e:
                        logger.error(f"Error decoding email: {str(e)}")
                
                # Clean up the body text
                body = re.sub(r'\s+', ' ', body).strip()
                
                emails.append({
                    "from": from_addr,
                    "subject": subject,
                    "body": body
                })
                
                logger.info(f"Processed email: {subject}")
            except Exception as e:
                logger.error(f"Error processing email ID {e_id}: {str(e)}")
                continue
        
        mail.close()
        mail.logout()
        
        logger.info(f"Successfully retrieved {len(emails)} unread emails")
        return jsonify({"emails": emails}), 200
    
    except Exception as e:
        logger.error(f"Error reading unread emails: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to read unread emails: {str(e)}"}), 500

@app.route('/api/facial-recognition', methods=['POST'])
def facial_recognition():
    logger.info("Authentication request received")
    
    if 'image' not in request.files:
        logger.error("No image file provided in request")
        return jsonify({"error": "No image file provided"}), 400
    
    if 'username' not in request.form:
        logger.error("No username provided in request")
        return jsonify({"error": "No username provided"}), 400
    
    image_file = request.files['image']
    username = request.form['username']
    
    logger.info(f"Processing authentication for username: {username}")
    
    # Check if username is registered
    if username not in registered_faces:
        logger.warning(f"Username not registered: {username}")
        return jsonify({"authenticated": False, "message": "User not registered. Please register your face first."}), 200
    
    try:
        # Save temporary image file
        temp_path = "temp_image.jpg"
        image_file.save(temp_path)
        logger.info(f"Saved temporary image file to {temp_path}")
        
        # Load the image
        logger.info("Loading image with face_recognition library")
        image = face_recognition.load_image_file(temp_path)
        logger.info(f"Image loaded successfully, shape: {image.shape}")
        
        # Find all face locations in the image
        logger.info("Detecting faces in the image")
        face_locations = face_recognition.face_locations(image)
        logger.info(f"Number of faces detected: {len(face_locations)}")
        
        # If no faces found
        if len(face_locations) == 0:
            os.remove(temp_path)
            logger.warning("No faces detected in the image")
            return jsonify({"authenticated": False, "message": "No face detected"}), 200
        
        # Get face encodings
        logger.info("Computing face encodings")
        face_encodings = face_recognition.face_encodings(image, face_locations)
        
        if len(face_encodings) == 0:
            os.remove(temp_path)
            logger.error("Failed to compute face encodings")
            return jsonify({"authenticated": False, "message": "Failed to process face. Please try again with better lighting."}), 200
        
        # Compare with registered face for this username
        logger.info("Comparing face encodings")
        matches = face_recognition.compare_faces([registered_faces[username]], face_encodings[0], tolerance=0.5)
        
        os.remove(temp_path)
        
        if matches[0]:
            logger.info("Authentication successful")
            return jsonify({
                "authenticated": True, 
                "message": "Authentication successful",
                "username": username
            }), 200
        else:
            logger.warning("Face does not match registered user")
            return jsonify({"authenticated": False, "message": "Face does not match registered user"}), 200
    
    except Exception as e:
        logger.error(f"Error in facial authentication: {str(e)}", exc_info=True)
        # Clean up temp file if it exists
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """
    Backward compatibility endpoint for facial recognition login.
    Redirects to the facial-recognition endpoint.
    """
    logger.info("Login request received, forwarding to facial recognition endpoint")
    return facial_recognition()

@app.route('/api/users', methods=['GET'])
def get_users():
    """Return list of registered users"""
    users = list(registered_faces.keys())
    logger.info(f"Get users request, returning {len(users)} users")
    return jsonify(users), 200

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """
    Convert text to speech using gTTS (Google Text-to-Speech)
    Returns an audio file in MP3 format
    """
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text = data['text']
    logger.info(f"Text-to-speech request received for text of length: {len(text)}")
    
    try:
        # Create a temporary file to store the audio
        mp3_fp = io.BytesIO()
        
        # Use gTTS to generate the speech
        # Slower but higher quality than browser's built-in TTS
        tts = gTTS(text=text, lang='en', slow=False)
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        
        logger.info("Successfully generated speech audio")
        return Response(mp3_fp.read(), mimetype='audio/mpeg')
        
    except Exception as e:
        logger.error(f"Error generating speech: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0') 