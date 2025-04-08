import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './VoiceInput.css';

// Backend API base URL
const API_BASE_URL = 'http://localhost:5001';

interface VoiceInputProps {
  onCommand: (command: string) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [isVoiceInputAvailable, setIsVoiceInputAvailable] = useState<boolean | null>(null);
  
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    // Check if speech recognition is supported in this browser
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      setIsSpeechSupported(false);
      setMessage('Voice commands are not supported in this browser. Please use Chrome or Edge.');
      setStatus('error');
    } else {
      // Initialize speech recognition
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        console.log('Speech recognized:', result);
        setTranscript(result);
        processVoiceCommand(result);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setMessage(`Error: ${event.error}. Please try again.`);
        setStatus('error');
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        if (status !== 'processing') {
          setIsListening(false);
        }
      };
    }
    
    // Check if backend voice processing is available
    checkVoiceProcessingAvailability();
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);
  
  const checkVoiceProcessingAvailability = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/check-voice-processing`, { 
        timeout: 5000 
      });
      console.log('Voice processing availability:', response.data);
      setIsVoiceInputAvailable(response.data.available);
      
      if (!response.data.available) {
        setMessage(response.data.message || 'Server-side voice processing is not available.');
        setStatus('error');
      }
    } catch (error) {
      console.error('Error checking voice processing availability:', error);
      setIsVoiceInputAvailable(false);
      setMessage('Could not connect to the voice processing service. Voice commands may not work properly.');
      setStatus('error');
    }
  };
  
  const processVoiceCommand = async (command: string) => {
    setStatus('processing');
    setMessage('Processing command...');
    
    try {
      // Check if the command is a simple UI action or needs backend processing
      if (command.toLowerCase().includes('compose email') || 
          command.toLowerCase().includes('new email') ||
          command.toLowerCase().includes('write email')) {
        // Simple UI actions can be handled directly
        onCommand(command);
        setStatus('idle');
        setMessage('Command executed.');
        setTimeout(() => setMessage(''), 2000);
      } else {
        // Send to backend for processing
        const response = await axios.post(
          `${API_BASE_URL}/api/process-voice-command`, 
          { command },
          { timeout: 10000 }
        );
        
        console.log('Command processing result:', response.data);
        
        if (response.data.success) {
          onCommand(command);
          setStatus('idle');
          setMessage(response.data.message || 'Command processed successfully.');
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Could not process the command. Please try again.');
        }
        
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      setStatus('error');
      setMessage('Error processing voice command. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };
  
  const toggleListening = () => {
    if (!isSpeechSupported) {
      setMessage('Voice commands are not supported in this browser. Please use Chrome or Edge.');
      setStatus('error');
      return;
    }
    
    if (isVoiceInputAvailable === false) {
      setMessage('Voice command processing is not available. Please try again later.');
      setStatus('error');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setStatus('idle');
    } else {
      setTranscript('');
      setMessage('Listening...');
      setStatus('listening');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setMessage('Error starting voice recognition. Please try again.');
        setStatus('error');
      }
    }
  };
  
  return (
    <div className="voice-input-container">
      <button 
        className={`voice-button ${status === 'listening' ? 'listening' : 
          status === 'processing' ? 'processing' : 
          status === 'error' ? 'error' : ''}`}
        onClick={toggleListening}
        disabled={status === 'processing' || !isSpeechSupported}
      >
        <span className="microphone-icon">🎤</span>
        {isListening ? 'Stop' : 'Voice Command'}
      </button>
      
      {transcript && (
        <div className="transcript">
          "{transcript}"
        </div>
      )}
      
      {message && (
        <div className={`voice-message ${status === 'error' ? 'error-message' : ''}`}>
          {message}
        </div>
      )}
    </div>
  );
};

// Add fallbacks for TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default VoiceInput; 