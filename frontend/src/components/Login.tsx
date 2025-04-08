import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import './Login.css';
import AnimatedLoading from './AnimatedLoading';
import { CheckmarkAnimation, MicrophoneAnimation } from './VectorAnimations';

// Backend API base URL
const API_BASE_URL = 'http://localhost:5001';

interface LoginProps {
  onLoginSuccess: (userData: any) => void;
  onSwitchToSignUp: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToSignUp }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [username, setUsername] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [registeredUsers, setRegisteredUsers] = useState<string[]>([]);

  useEffect(() => {
    // Check if backend is available and fetch registered users
    const checkBackendStatus = async () => {
      try {
        console.log('Checking backend connection...');
        const response = await axios.get(`${API_BASE_URL}/api/users`, { timeout: 3000 });
        console.log('Backend connection successful. Registered users:', response.data);
        setBackendStatus('online');
        setRegisteredUsers(response.data);
        
        if (response.data.length === 0) {
          console.log('No registered users found in the database.');
          setLoginMessage('No registered users found. Please create an account first.');
        } else {
          console.log(`Found ${response.data.length} registered users: ${response.data.join(', ')}`);
        }
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendStatus('offline');
        setLoginMessage('Cannot connect to server. Please make sure the backend server is running.');
        setLoginStatus('error');
      }
    };

    // Initialize webcam when component mounts
    const initWebcam = async () => {
      try {
        console.log('Initializing webcam...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('Webcam initialized successfully');
        }
      } catch (error) {
        console.error('Error accessing webcam:', error);
        setLoginMessage('Error accessing webcam. Please allow camera access.');
        setLoginStatus('error');
      }
    };

    checkBackendStatus();
    initWebcam();

    // Cleanup function
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        console.log('Cleaning up webcam resources');
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const retryBackendConnection = async () => {
    setBackendStatus('checking');
    setLoginMessage('Checking server connection...');
    setLoginStatus('loading');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users`, { timeout: 3000 });
      console.log('Backend reconnection successful. Registered users:', response.data);
      setBackendStatus('online');
      setRegisteredUsers(response.data);
      setLoginMessage('Connected to server successfully!');
      setLoginStatus('idle');
      
      if (response.data.length === 0) {
        console.log('No registered users found in the database after retry.');
        setLoginMessage('No registered users found. Please create an account first.');
      } else {
        console.log(`Found ${response.data.length} registered users after retry: ${response.data.join(', ')}`);
        setTimeout(() => {
          setLoginMessage('');
        }, 2000);
      }
    } catch (error) {
      console.error('Backend reconnection failed:', error);
      setBackendStatus('offline');
      setLoginMessage(`Cannot connect to server. Please make sure the backend server is running at ${API_BASE_URL}`);
      setLoginStatus('error');
    }
  };

  const authenticateFace = () => {
    if (backendStatus === 'offline') {
      setLoginMessage('Cannot connect to server. Please make sure the backend server is running.');
      setLoginStatus('error');
      return;
    }

    if (!username.trim()) {
      console.log('Authentication failed: Empty username');
      setLoginMessage('Please enter your username');
      setLoginStatus('error');
      return;
    }

    console.log('Current registered users:', registeredUsers);
    
    if (registeredUsers.length > 0 && !registeredUsers.includes(username)) {
      console.log(`Authentication failed: Username "${username}" not found in registered users list:`, registeredUsers);
      setLoginMessage(`Username "${username}" is not registered. Please enter a valid username or create a new account.`);
      setLoginStatus('error');
      return;
    }

    if (videoRef.current && canvasRef.current) {
      setIsCapturing(true);
      setLoginStatus('loading');
      setLoginMessage('Authenticating...');

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        try {
          console.log('Drawing video to canvas...');
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Draw video frame on canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          console.log('Video drawn to canvas successfully');

          // Convert canvas to blob
          canvas.toBlob(async (blob) => {
            if (blob) {
              console.log('Canvas converted to blob, size:', blob.size);
              try {
                // Create form data with image and username
                const formData = new FormData();
                formData.append('image', blob, 'face.jpg');
                formData.append('username', username);

                console.log('Sending authentication request to server...');
                // Send to backend for face authentication with timeout
                const response = await axios.post(`${API_BASE_URL}/api/facial-recognition`, formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  },
                  timeout: 30000, // 30 seconds timeout
                });

                console.log('Authentication response:', response.data);

                if (response.data.authenticated) {
                  setLoginMessage(`Welcome back, ${username}!`);
                  setLoginStatus('success');
                  
                  // Turn off camera after successful authentication
                  if (videoRef.current && videoRef.current.srcObject) {
                    console.log('Stopping camera after successful authentication');
                    const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                    tracks.forEach(track => track.stop());
                  }
                  
                  // Call the onLoginSuccess callback after a short delay
                  setTimeout(() => {
                    onLoginSuccess({ username });
                  }, 1500);
                } else {
                  console.error('Authentication failed:', response.data.message);
                  setLoginMessage(response.data.message || 'Authentication failed. Please try again.');
                  setLoginStatus('error');
                  setIsCapturing(false);
                }
              } catch (error: any) {
                console.error('Error during face authentication:', error);
                if (error.code === 'ECONNABORTED') {
                  setLoginMessage('Request timed out. The server might be busy or taking too long to process your request.');
                } else if (error.response) {
                  console.error('Response data:', error.response.data);
                  console.error('Response status:', error.response.status);
                  setLoginMessage(`Authentication error: ${error.response.data.error || error.response.statusText}`);
                } else if (error.request) {
                  console.error('No response received:', error.request);
                  setLoginMessage('No response from server. Please check if the backend server is running.');
                  setBackendStatus('offline');
                } else {
                  console.error('Error message:', error.message);
                  setLoginMessage(`Authentication error: ${error.message}`);
                }
                setLoginStatus('error');
                setIsCapturing(false);
              }
            } else {
              console.error('Failed to create blob from canvas');
              setLoginMessage('Failed to capture image. Please try again.');
              setLoginStatus('error');
              setIsCapturing(false);
            }
          }, 'image/jpeg', 0.95); // Higher quality JPEG
        } catch (error) {
          console.error('Error capturing image:', error);
          setLoginMessage('Error capturing image. Please try again.');
          setLoginStatus('error');
          setIsCapturing(false);
        }
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-instruction">
          Enter your username and position your face in the frame, then click Login to access your account.
        </p>
        
        {backendStatus === 'offline' && (
          <div className="backend-status-container">
            <div className="backend-status offline">
              <span>Backend server is unreachable</span>
              <button onClick={retryBackendConnection} className="retry-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                Retry Connection
              </button>
            </div>
          </div>
        )}
        
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="username-input"
            disabled={loginStatus === 'loading' || isCapturing}
          />
          <label className="input-label">Username</label>
        </div>

        <div className="webcam-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`webcam ${isCapturing ? 'capturing' : ''}`}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {loginStatus === 'loading' && (
            <div className="webcam-overlay">
              <AnimatedLoading type="spinner" text="Authenticating..." color="#6366f1" />
            </div>
          )}
        </div>

        {loginMessage && (
          <div className={`login-message ${loginStatus}`}>
            {loginStatus === 'success' && <CheckmarkAnimation width="20px" height="20px" className="mr-2" />}
            {loginStatus === 'error' && (
              <svg className="message-icon error" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
            {loginMessage}
          </div>
        )}

        <div className="button-group">
          <button
            className={`login-button ${loginStatus === 'loading' ? 'loading' : ''}`}
            onClick={authenticateFace}
            disabled={loginStatus === 'loading' || backendStatus === 'offline' || isCapturing}
          >
            {loginStatus === 'loading' ? (
              <AnimatedLoading type="dots" size="sm" text="" color="white" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
                </svg>
                Login with Face
              </>
            )}
          </button>
          
          <div className="signup-prompt">
            <span>Don't have an account?</span>
            <button className="signup-link" onClick={onSwitchToSignUp}>
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 