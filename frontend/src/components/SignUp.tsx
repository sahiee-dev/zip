import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import './SignUp.css';

// Backend API base URL
const API_BASE_URL = 'http://localhost:5001';

interface SignUpProps {
  onSignUpSuccess: (username: string) => void;
  onSwitchToLogin: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onSignUpSuccess, onSwitchToLogin }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [signUpMessage, setSignUpMessage] = useState('');
  const [signUpStatus, setSignUpStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [username, setUsername] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    // Check if backend is available
    const checkBackendStatus = async () => {
      try {
        console.log('Checking backend connection...');
        const response = await axios.get(`${API_BASE_URL}/api/users`, { timeout: 3000 });
        console.log('Backend connection successful:', response.data);
        setBackendStatus('online');
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendStatus('offline');
        setSignUpMessage('Cannot connect to server. Please make sure the backend server is running.');
        setSignUpStatus('error');
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
        setSignUpMessage('Error accessing webcam. Please allow camera access.');
        setSignUpStatus('error');
      }
    };

    checkBackendStatus();
    initWebcam();

    // Cleanup function to ensure camera is stopped when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  // Function to stop the camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      console.log('Stopping camera');
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const retryBackendConnection = async () => {
    setBackendStatus('checking');
    setSignUpMessage('Checking server connection...');
    setSignUpStatus('loading');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users`, { timeout: 3000 });
      console.log('Backend reconnection successful:', response.data);
      setBackendStatus('online');
      setSignUpMessage('Connected to server successfully!');
      setSignUpStatus('idle');
      setTimeout(() => {
        setSignUpMessage('');
      }, 2000);
    } catch (error) {
      console.error('Backend reconnection failed:', error);
      setBackendStatus('offline');
      setSignUpMessage(`Cannot connect to server. Please make sure the backend server is running at ${API_BASE_URL}`);
      setSignUpStatus('error');
    }
  };

  const registerFace = () => {
    if (backendStatus === 'offline') {
      setSignUpMessage('Cannot connect to server. Please make sure the backend server is running.');
      setSignUpStatus('error');
      return;
    }

    if (!username.trim()) {
      setSignUpMessage('Please enter a username');
      setSignUpStatus('error');
      return;
    }

    if (videoRef.current && canvasRef.current) {
      setIsCapturing(true);
      setSignUpStatus('loading');
      setSignUpMessage('Capturing face...');

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        try {
          console.log('Drawing video to canvas...');
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Draw video frame on canvas with horizontal flip for mirroring effect
          // First save the context state
          context.save();
          // Flip horizontally for the mirror effect
          context.scale(-1, 1);
          // Draw the video but offset by negative width (because of the scale flip)
          context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          // Restore context to normal state
          context.restore();
          
          console.log('Video drawn to canvas successfully with mirror effect');

          // Convert canvas to blob
          canvas.toBlob(async (blob) => {
            if (blob) {
              console.log('Canvas converted to blob, size:', blob.size);
              try {
                // Create form data with image and username
                const formData = new FormData();
                formData.append('image', blob, 'face.jpg');
                formData.append('username', username);

                console.log('Sending registration request to server...');
                // Send to backend for face registration with timeout
                const response = await axios.post(`${API_BASE_URL}/api/register-face`, formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  },
                  timeout: 30000, // 30 seconds timeout
                });

                console.log('Registration response:', response.data);

                if (response.data.registered) {
                  setSignUpMessage('Registration successful! You can now log in.');
                  setSignUpStatus('success');
                  
                  // Stop the camera after successful registration
                  stopCamera();
                  
                  // Call the onSignUpSuccess callback after a short delay
                  setTimeout(() => {
                    onSignUpSuccess(username);
                  }, 1500);
                } else {
                  console.error('Registration failed:', response.data.message);
                  setSignUpMessage(response.data.message || 'Registration failed. Please try again.');
                  setSignUpStatus('error');
                  setIsCapturing(false);
                }
              } catch (error: any) {
                console.error('Error during face registration:', error);
                if (error.code === 'ECONNABORTED') {
                  setSignUpMessage('Request timed out. The server might be busy or taking too long to process your request.');
                  setBackendStatus('offline');
                } else if (error.response) {
                  console.error('Response data:', error.response.data);
                  console.error('Response status:', error.response.status);
                  setSignUpMessage(`Registration error: ${error.response.data.error || error.response.statusText}`);
                } else if (error.request) {
                  console.error('No response received:', error.request);
                  setSignUpMessage('No response from server. Please check if the backend server is running.');
                  setBackendStatus('offline');
                } else {
                  console.error('Error message:', error.message);
                  setSignUpMessage(`Registration error: ${error.message}`);
                }
                setSignUpStatus('error');
                setIsCapturing(false);
              }
            } else {
              console.error('Failed to create blob from canvas');
              setSignUpMessage('Failed to capture image. Please try again.');
              setSignUpStatus('error');
              setIsCapturing(false);
            }
          }, 'image/jpeg', 0.95); // Higher quality JPEG
        } catch (error) {
          console.error('Error capturing image:', error);
          setSignUpMessage('Error capturing image. Please try again.');
          setSignUpStatus('error');
          setIsCapturing(false);
        }
      }
    }
  };

  return (
    <div className="signup-container">
      <h2 className="signup-title">Create Account</h2>
      <p className="signup-instruction">
        Please enter a username and position your face in the frame, then click register to create your account.
      </p>
      
      {backendStatus === 'offline' && (
        <div className="backend-status-container">
          <div className="backend-status offline">
            <span>Backend server is unreachable</span>
            <button onClick={retryBackendConnection} className="retry-button">
              Retry Connection
            </button>
          </div>
        </div>
      )}
      
      <input
        type="text"
        placeholder="Enter username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="username-input"
      />
      
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="webcam-video mirrored"
          style={{ 
            display: isCapturing ? 'none' : 'block',
            transform: 'scaleX(-1)' // Flip the video horizontally for mirror effect 
          }}
        />
        <canvas
          ref={canvasRef}
          className="webcam-canvas"
          style={{ display: isCapturing ? 'block' : 'none' }}
        />
        
        {signUpStatus === 'loading' && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
      
      {signUpMessage && (
        <div 
          className={`signup-message ${
            signUpStatus === 'success' 
              ? 'success-message' 
              : signUpStatus === 'error' 
              ? 'error-message' 
              : 'info-message'
          }`}
        >
          {signUpMessage}
        </div>
      )}
      
      <div className="button-row">
        <button
          onClick={registerFace}
          disabled={signUpStatus === 'loading' || signUpStatus === 'success' || !username.trim() || backendStatus !== 'online'}
          className={`signup-button ${
            signUpStatus === 'loading' || signUpStatus === 'success' || !username.trim() || backendStatus !== 'online'
              ? 'button-disabled'
              : 'button-primary'
          }`}
        >
          {signUpStatus === 'loading' ? 'Registering...' : 'Register Face'}
        </button>
        
        <button
          onClick={onSwitchToLogin}
          className="signup-button button-primary"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default SignUp; 