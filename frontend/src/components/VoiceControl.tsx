import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './VoiceControl.css';
import { MicrophoneAnimation, MailAnimation, WavesAnimation, TalkingAnimation, CheckmarkAnimation } from './VectorAnimations';

// Backend API base URL
const API_BASE_URL = 'http://localhost:5001';

interface VoiceControlProps {
  email: string;
  mode: 'send' | 'read';
  onComplete: () => void;
  onCancel: () => void;
  username: string;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ 
  email, 
  mode, 
  onComplete, 
  onCancel,
  username
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [step, setStep] = useState<'recipient' | 'subject' | 'body' | 'confirm' | 'reading'>(
    mode === 'send' ? 'recipient' : 'reading'
  );
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [unreadEmails, setUnreadEmails] = useState<any[]>([]);
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [showFullBody, setShowFullBody] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showRetryButton, setShowRetryButton] = useState<boolean>(false);
  const [usingFallbackAPI, setUsingFallbackAPI] = useState<boolean>(false);
  
  // Add a reference for tracking service status checks
  const serviceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  
  // Add a loading state for service initialization
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  
  // Add a flag to track if a service check is already in progress
  const [isCheckingService, setIsCheckingService] = useState<boolean>(false);
  const tempRecognitionRef = useRef<any>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    const initResult = initializeSpeechRecognition();
    
    // If initialization failed, try to check service anyway after a delay
    if (!initResult) {
      setTimeout(() => {
        if (!isCheckingService) {
          checkSpeechRecognitionService();
        }
      }, 2000);
    }
    
    // Add an interval to periodically check service status when there's an error
    // but avoid having multiple concurrent checks
    serviceCheckIntervalRef.current = setInterval(() => {
      if (error && error.includes("unavailable") && !isListening && !isCheckingService) {
        console.log("Periodic service check triggered");
        checkSpeechRecognitionService();
      }
    }, 60000); // Check every minute
    
    // Cleanup function
    return () => {
      // First clean up any temp recognition instance
      cleanupTempRecognition();
      
      // Then clean up the main recognition instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error("Error stopping recognition during cleanup", err);
        }
        recognitionRef.current = null;
      }
      
      // Clear any pending timeouts and intervals
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (retryButtonTimeoutRef.current) {
        clearTimeout(retryButtonTimeoutRef.current);
        retryButtonTimeoutRef.current = null;
      }
      if (serviceCheckIntervalRef.current) {
        clearInterval(serviceCheckIntervalRef.current);
        serviceCheckIntervalRef.current = null;
      }
      
      // Stop any ongoing audio playback
      stopReading();
    };
  }, []);
  
  // Create a separate function for initializing speech recognition
  const initializeSpeechRecognition = () => {
    try {
      setIsInitializing(true);
      
      // If there's already a recognition instance, clean it up first
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (err) {
          console.error("Error cleaning up existing recognition instance", err);
        }
      }
      
      if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        // Create new instance
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        // Initial setup of event handlers
        setupSpeechRecognitionHandlers();
        
        // Specific error handling for initialization failures
        recognitionRef.current.onerror = handleSpeechRecognitionError;
        
        // Set fallback flag to false
        setUsingFallbackAPI(false);
        
        // Set status message for connecting
        setStatus('Connecting to speech recognition service...');
        
        // We'll do a delayed service check to reduce chances of overlapping checks
        setTimeout(() => {
          // Only check if we're not already checking and we're still mounted (component not unmounted)
          if (!isCheckingService) {
            checkSpeechRecognitionService();
          }
        }, 1000);
        
        console.log("Speech recognition initialized successfully");
        return true;
      } else {
        // Browser doesn't support SpeechRecognition
        console.error("Browser doesn't support SpeechRecognition");
        setError('Your browser does not support speech recognition. Try using Chrome.');
        setUsingFallbackAPI(true);
        setServiceAvailable(false);
        setIsInitializing(false);
        return false;
      }
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      setError('Failed to initialize speech recognition. Will try fallback options.');
      setUsingFallbackAPI(true);
      setServiceAvailable(false);
      setIsInitializing(false);
      return false;
    }
  };
  
  // Function to format email addresses (remove spaces)
  const formatEmailAddress = (text: string): string => {
    // For recipient step, format as email address (remove spaces)
    if (step === 'recipient') {
      // Remove all spaces for email addresses
      return text.replace(/\s+/g, '');
    }
    return text;
  };
  
  // Handle completing each step based on the transcript
  useEffect(() => {
    if (!finalTranscript.trim()) return;
    
    if (mode === 'send') {
      switch (step) {
        case 'recipient':
          // Format recipient email by removing all spaces
          const formattedEmail = formatEmailAddress(finalTranscript.trim());
          setRecipient(formattedEmail);
          setStep('subject');
          setFinalTranscript('');
          break;
        
        case 'subject':
          setSubject(finalTranscript.trim());
          setStep('body');
          setFinalTranscript('');
          break;
          
        case 'body':
          setBody(finalTranscript.trim());
          setStep('confirm');
          setFinalTranscript('');
          break;
          
        case 'confirm':
          if (finalTranscript.toLowerCase().includes('yes') || 
              finalTranscript.toLowerCase().includes('send') || 
              finalTranscript.toLowerCase().includes('confirm')) {
            sendEmail();
          } else if (finalTranscript.toLowerCase().includes('no') ||
                    finalTranscript.toLowerCase().includes('cancel')) {
            onCancel();
          }
          setFinalTranscript('');
          break;
      }
    }
  }, [finalTranscript]);
  
  // When in read mode, fetch unread emails when component mounts
  useEffect(() => {
    if (mode === 'read') {
      fetchUnreadEmails();
    }
  }, [mode, email]);

  // Effect to handle audio playback
  useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.play();
    }
  }, [audioSrc]);
  
  // Add a function to check microphone availability
  const checkMicrophoneAvailability = async (): Promise<boolean> => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check if we have at least one audio track
      if (stream.getAudioTracks().length > 0) {
        // Release the stream
        stream.getAudioTracks().forEach(track => track.stop());
        return true;
      }
      
      // No audio tracks found
      return false;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      return false;
    }
  };
  
  // Update startListening to first check if microphone is available
  const startListening = async () => {
    // Don't start if already listening or checking
    if (isListening || isCheckingService) {
      console.log("Already listening or checking service, ignoring start request");
      return;
    }
    
    // Clear any errors
    setError('');
    
    // Check if browser supports speech recognition
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser. Try using Chrome.');
      return;
    }
    
    // Check if service is available before trying
    if (serviceAvailable === false) {
      console.log("Service was previously marked as unavailable, rechecking");
      // Re-check service availability
      checkSpeechRecognitionService();
      
      // Wait for check to complete
      setTimeout(() => {
        if (!isCheckingService && serviceAvailable) {
          // If service is now available, continue with starting
          proceedWithStartListening();
        } else if (!isCheckingService && !serviceAvailable) {
          // If service is still unavailable, show error
          setError('Speech recognition service is still unavailable. Please try again later.');
          setShowRetryButton(true);
        }
        // If still checking, do nothing and let the check complete
      }, 6000);
    } else {
      // If service is available or unknown, proceed with starting
      proceedWithStartListening();
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };
  
  const checkEmailAccountExists = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/check-account`, {
        email,
        username
      });
      return response.data.exists;
    } catch (error) {
      console.error('Error checking account existence:', error);
      return false;
    }
  };
  
  const sendEmail = async () => {
    setLoading(true);
    setStatus('Sending email...');
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/send-email`, {
        from_email: email,
        to_email: recipient,
        subject: subject,
        body: body,
        username
      });
      
      setStatus('Email sent successfully!');
      
      // Automatically complete the process after showing success message
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error: any) {
      console.error('Error sending email:', error);
      
      let errorMessage = 'Failed to send email.';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        errorMessage = error.response.data.error || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUnreadEmails = async () => {
    setLoading(true);
    setStatus('Fetching unread emails...');
    setError('');
    
    // Check if the email account exists
    const accountExists = await checkEmailAccountExists();
    if (!accountExists) {
      setError(`Email account ${email} is not set up. Please add your account in the settings first.`);
      setLoading(false);
      return;
    }
    
    console.log('Attempting to fetch unread emails for:', email);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/read-unread-emails`, {
        email: email,
        username: username
      });
      
      console.log('Email fetch response data:', response.data);
      
      if (response.data && Array.isArray(response.data.emails)) {
        // Reverse the emails array to show newest emails first
        const emails = [...response.data.emails].reverse() || [];
        console.log(`Retrieved ${emails.length} unread emails`);
        
        setUnreadEmails(emails);
        setStatus(`Found ${emails.length} unread email(s).`);
        
        if (emails.length > 0) {
          setCurrentEmailIndex(0);
          console.log('Sample email:', emails[0]);
        } else {
          setStatus('No unread emails found.');
          console.log('No emails were returned from the server.');
          setTimeout(() => {
            onComplete();
          }, 3000);
        }
      } else {
        console.error('Unexpected API response format:', response.data);
        setError('Unexpected response from server. Check console for details.');
      }
    } catch (error: any) {
      console.error('Error fetching unread emails:', error);
      let errorMessage = 'Failed to fetch unread emails. Please try again.';
      
      if (error.response) {
        console.error('Error response data:', error.response.data);
        errorMessage = error.response.data.error || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Format email for text-to-speech to avoid spaces in email addresses
  const formatEmailForSpeech = (emailText: string): string => {
    // Replace email pattern with no-space version
    return emailText.replace(/[\w.-]+@[\w.-]+\.\w+/g, (match) => {
      return match.replace(/\s+/g, '');
    });
  };
  
  const readEmailAloud = async (emailData: any, index: number) => {
    // First, stop any ongoing reading
    stopReading();
    
    // Set status to indicate we're reading
    setIsReading(true);
    
    // Format the from address to ensure no spaces in email addresses
    const fromAddress = formatEmailForSpeech(emailData.from);
    
    // Create message to read aloud (only sender and subject)
    const message = `Email ${index + 1} of ${unreadEmails.length}. From: ${fromAddress}. Subject: ${emailData.subject}.`;
    
    try {
      // Try to use the backend gTTS service if available
      console.log("Trying to use gTTS text-to-speech service...");
      const response = await axios.post(`${API_BASE_URL}/api/text-to-speech`, {
        text: message
      }, { responseType: 'blob' });
      
      console.log("Received response from text-to-speech API", response);
      
      // Create URL for the audio blob
      const audioUrl = URL.createObjectURL(response.data);
      setAudioSrc(audioUrl);
      
      // Ensure the audio element is ready before playing
      if (audioRef.current) {
        console.log("Playing audio with audio element");
        
        // Add event listeners for debugging
        audioRef.current.onplay = () => console.log("Audio playback started");
        audioRef.current.onended = () => {
          console.log("Audio playback ended");
          URL.revokeObjectURL(audioUrl);
          setIsReading(false);
          setAudioSrc(null);
        };
        audioRef.current.onerror = (e) => console.error("Audio playback error:", e);
        
        // Explicitly play the audio
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => console.log("Audio playback successfully started"))
            .catch(error => {
              console.error("Audio playback failed to start:", error);
              // Fall back to browser's built-in TTS
              fallbackToBuiltInTTS(message);
            });
        }
      } else {
        console.warn("No audio element reference available, falling back to built-in TTS");
        fallbackToBuiltInTTS(message);
      }
    } catch (error) {
      console.error("Error using gTTS, falling back to browser TTS:", error);
      fallbackToBuiltInTTS(message);
    }
  };
  
  const fallbackToBuiltInTTS = (message: string) => {
    console.log("Using browser's built-in TTS as fallback");
    // Fallback to browser's speech synthesis
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(message);
    
    // Optional: You can customize the voice if needed
    // const voices = synth.getVoices();
    // utterance.voice = voices[0]; // Select a voice
    
    utterance.onend = () => {
      console.log("Browser TTS finished speaking");
      setIsReading(false);
    };
    
    utterance.onerror = (event) => {
      console.error("Browser TTS error:", event);
      setIsReading(false);
    };
    
    synth.speak(utterance);
  };
  
  const stopReading = () => {
    // Stop browser speech synthesis
    window.speechSynthesis.cancel();
    
    // Stop audio element if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Clean up audio URL if exists
    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
      setAudioSrc(null);
    }
    
    setIsReading(false);
  };
  
  const readFullEmail = async (emailData: any, index: number) => {
    // First, stop any ongoing reading
    stopReading();
    
    // Set status to indicate we're reading
    setIsReading(true);
    
    // Format the from address to ensure no spaces in email addresses
    const fromAddress = formatEmailForSpeech(emailData.from);
    
    // Message including body
    const message = `Email ${index + 1} of ${unreadEmails.length}. From: ${fromAddress}. Subject: ${emailData.subject}. Message: ${emailData.body}`;
    
    try {
      // Try to use the backend gTTS service if available
      console.log("Trying to use gTTS text-to-speech service for full email...");
      const response = await axios.post(`${API_BASE_URL}/api/text-to-speech`, {
        text: message
      }, { responseType: 'blob' });
      
      console.log("Received response from text-to-speech API for full email");
      
      // Create URL for the audio blob
      const audioUrl = URL.createObjectURL(response.data);
      setAudioSrc(audioUrl);
      
      // Ensure the audio element is ready before playing
      if (audioRef.current) {
        console.log("Playing audio with audio element");
        
        // Add event listeners for debugging
        audioRef.current.onplay = () => console.log("Audio playback started");
        audioRef.current.onended = () => {
          console.log("Audio playback ended");
          URL.revokeObjectURL(audioUrl);
          setIsReading(false);
          setAudioSrc(null);
        };
        audioRef.current.onerror = (e) => console.error("Audio playback error:", e);
        
        // Explicitly play the audio
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => console.log("Audio playback successfully started"))
            .catch(error => {
              console.error("Audio playback failed to start:", error);
              // Fall back to browser's built-in TTS
              fallbackToBuiltInTTS(message);
            });
        }
      } else {
        console.warn("No audio element reference available, falling back to built-in TTS");
        fallbackToBuiltInTTS(message);
      }
    } catch (error) {
      console.error("Error using gTTS, falling back to browser TTS:", error);
      fallbackToBuiltInTTS(message);
    }
  };
  
  const readAllHeaders = async () => {
    // First, stop any ongoing reading
    stopReading();
    
    // Set status to indicate we're reading
    setIsReading(true);
    setStatus('Reading all email headers...');
    
    try {
      // Create a function to read headers sequentially
      const readHeadersSequentially = async (index = 0) => {
        if (index >= unreadEmails.length) {
          console.log('Finished reading all headers');
          setIsReading(false);
          setStatus(`Finished reading all ${unreadEmails.length} email headers`);
          return;
        }
        
        const emailData = unreadEmails[index];
        
        // Format the from address to ensure no spaces in email addresses
        const fromAddress = formatEmailForSpeech(emailData.from);
        
        // Create message to read aloud (only sender and subject)
        const message = `Email ${index + 1} of ${unreadEmails.length}. From: ${fromAddress}. Subject: ${emailData.subject}.`;
        
        try {
          console.log(`Starting to read header ${index + 1}`);
          setStatus(`Reading header ${index + 1} of ${unreadEmails.length}...`);
          
          // Try to use the backend gTTS service if available
          const response = await axios.post(`${API_BASE_URL}/api/text-to-speech`, {
            text: message
          }, { responseType: 'blob' });
          
          // Create URL for the audio blob
          const audioUrl = URL.createObjectURL(response.data);
          setAudioSrc(audioUrl);
          
          console.log(`Header ${index + 1} audio URL created, preparing to play`);
          
          // Return a promise that resolves when the audio finishes playing
          await new Promise((resolve, reject) => {
            if (audioRef.current) {
              // Clear any previous event listeners
              const audio = audioRef.current;
              const cloneAudio = audio.cloneNode(true) as HTMLAudioElement;
              
              // Replace the audio element to ensure clean event handling
              audio.parentNode?.replaceChild(cloneAudio, audio);
              audioRef.current = cloneAudio;
              
              // Set up event listeners
              audioRef.current.onplay = () => {
                console.log(`Header ${index + 1} playback started`);
              };
              
              audioRef.current.onended = () => {
                console.log(`Header ${index + 1} playback ended naturally`);
                URL.revokeObjectURL(audioUrl);
                
                // Wait a significant pause between headers (2 seconds)
                console.log(`Pausing for 2 seconds before reading next header`);
                setTimeout(resolve, 2000);
              };
              
              audioRef.current.onerror = (e) => {
                console.error(`Header ${index + 1} playback error:`, e);
                URL.revokeObjectURL(audioUrl);
                reject(e);
              };
              
              // Set source and play
              audioRef.current.src = audioUrl;
              
              // Add a small delay before playing to ensure audio element is ready
              setTimeout(() => {
                const playPromise = audioRef.current?.play();
                if (playPromise) {
                  playPromise.catch(error => {
                    console.error(`Header ${index + 1} failed to start:`, error);
                    fallbackToBuiltInTTS(message);
                    
                    // Wait 2 seconds before resolving even in error case
                    setTimeout(resolve, 2000);
                  });
                } else {
                  console.error(`Header ${index + 1} play returned undefined`);
                  reject(new Error("Play method failed"));
                }
              }, 500);
            } else {
              console.error("No audio element available for header", index + 1);
              reject(new Error("No audio element available"));
            }
          });
          
          console.log(`Header ${index + 1} completed, moving to next header`);
          
          // Move to the next header
          await readHeadersSequentially(index + 1);
        } catch (error) {
          console.error(`Error reading header ${index + 1}:`, error);
          
          // Try fallback TTS
          try {
            console.log(`Attempting fallback TTS for header ${index + 1}`);
            await new Promise<void>((resolve) => {
              // Use browser's built-in TTS as fallback
              const synth = window.speechSynthesis;
              const utterance = new SpeechSynthesisUtterance(message);
              
              utterance.onend = () => {
                console.log(`Fallback TTS for header ${index + 1} completed`);
                setTimeout(resolve, 2000); // 2 second pause before next header
              };
              
              utterance.onerror = (event) => {
                console.error(`Fallback TTS error for header ${index + 1}:`, event);
                setTimeout(resolve, 2000); // Continue anyway after 2 seconds
              };
              
              synth.speak(utterance);
            });
          } catch (fallbackError) {
            console.error(`Fallback TTS also failed for header ${index + 1}:`, fallbackError);
            // Wait a moment before continuing
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          // Continue with next header even if there's an error
          await readHeadersSequentially(index + 1);
        }
      };
      
      // Start reading headers sequentially from the first one
      console.log("Starting sequential reading of all headers");
      readHeadersSequentially(0);
    } catch (error) {
      console.error('Error in reading all headers:', error);
      setIsReading(false);
      setStatus('Failed to read all headers');
      
      // Fall back to browser's built-in TTS
      fallbackToBuiltInTTS(`Failed to read all ${unreadEmails.length} emails. Please try again.`);
    }
  };
  
  const getStepInstructions = () => {
    if (mode === 'send') {
      switch (step) {
        case 'recipient':
          return 'Please say the recipient\'s email address (will be formatted without spaces)';
        case 'subject':
          return 'Please say the subject of your email';
        case 'body':
          return 'Please say the body of your email';
        case 'confirm':
          return 'Do you want to send this email? Say "yes" to confirm or "no" to cancel';
        default:
          return '';
      }
    } else {
      return 'Reading your unread emails...';
    }
  };
  
  const getCurrentInputLabel = () => {
    if (mode === 'send') {
      switch (step) {
        case 'recipient':
          return 'Recipient';
        case 'subject':
          return 'Subject';
        case 'body':
          return 'Body';
        default:
          return '';
      }
    }
    return '';
  };
  
  const getCurrentInputValue = () => {
    if (mode === 'send') {
      switch (step) {
        case 'recipient':
          // Remove spaces from recipient email in real-time display
          return recipient || formatEmailAddress(transcript);
        case 'subject':
          return subject || transcript;
        case 'body':
          return body || transcript;
        default:
          return '';
      }
    }
    return '';
  };
  
  // Helper function to setup speech recognition event handlers
  const setupSpeechRecognitionHandlers = () => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setStatus('Listening...');
      console.log("Recognition started");
    };
    
    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          setFinalTranscript(prev => prev + ' ' + transcript);
        } else {
          interimTranscript += transcript;
        }
      }
      
      setTranscript(interimTranscript);
    };
    
    // Track the time when recognition started to detect unexpected stops
    let recognitionStartTime = Date.now();
    
    recognitionRef.current.onend = () => {
      console.log("Recognition ended");
      const wasActive = isListening;
      setIsListening(false);
      
      // Don't set any status message when recognition ends
      // This prevents showing a "ready" message when not actively listening
      if (status === 'Listening...') {
        setStatus('');
      }
      
      // Auto-restart if this was unexpected and not due to an error
      if (error === '' && !isCheckingService && serviceAvailable === true && wasActive) {
        const recognitionDuration = Date.now() - recognitionStartTime;
        
        // Only auto-restart if we were previously listening without errors
        // And don't restart if it's been running for less than 1 second (might be intentional stop)
        if (recognitionDuration > 1000) {
          console.log("Recognition unexpectedly ended after running for", 
            Math.round(recognitionDuration/1000), "seconds, auto-restarting...");
          
          // Use a short delay to avoid rapid restarts
          setTimeout(() => {
            if (!isListening && !isCheckingService && recognitionRef.current) {
              try {
                recognitionStartTime = Date.now(); // Reset the start time
                recognitionRef.current.start();
                console.log("Recognition auto-restarted");
              } catch (err) {
                console.error("Failed to auto-restart recognition:", err);
                // Only show retry button for repeated failures
                if (!wasActive) {
                  setError('Speech recognition unexpectedly stopped. Please try again.');
                  setShowRetryButton(true);
                }
              }
            }
          }, 300); // Shorter delay for faster recovery
        } else {
          console.log("Recognition ended after a very short time, not auto-restarting");
        }
      }
    };
  };
  
  // Improved function to check if speech recognition service is available
  const checkSpeechRecognitionService = () => {
    // Don't start a new check if one is already in progress
    if (isCheckingService) {
      console.log("Service check already in progress, skipping new check");
      return;
    }
    
    // Clear any existing status check interval
    if (serviceCheckIntervalRef.current) {
      clearInterval(serviceCheckIntervalRef.current);
      serviceCheckIntervalRef.current = null;
    }
    
    // Make sure we clean up any previous temp recognition instance
    if (tempRecognitionRef.current) {
      try {
        tempRecognitionRef.current.abort();
        tempRecognitionRef.current = null;
      } catch (err) {
        console.error("Error cleaning up previous temp recognition", err);
      }
    }

    // Only check if we have internet connection
    if (navigator.onLine) {
      console.log("Checking speech recognition service availability...");
      setIsCheckingService(true);
      
      try {
        // Create a temporary speech recognition instance
        tempRecognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        
        // Set shorter timeouts for recognition
        tempRecognitionRef.current.maxAlternatives = 1;
        tempRecognitionRef.current.continuous = false;
        tempRecognitionRef.current.interimResults = false;
        
        // Set up a timeout to detect if start() hangs
        // Use a longer timeout to avoid false negatives
        const timeoutId = setTimeout(() => {
          console.log("Speech recognition service check timed out");
          cleanupTempRecognition();
          
          // Even if timeout happens, let's assume service might be working
          // Just give a warning in console but don't disable functionality
          console.warn("Speech recognition check timed out but assuming service might still work");
          setServiceAvailable(true); // Assume it's working despite timeout
          setError('');
          setIsInitializing(false);
          setIsCheckingService(false);
        }, 8000); // Longer timeout to avoid false negatives
        
        // If it starts successfully, the service is available
        tempRecognitionRef.current.onstart = () => {
          clearTimeout(timeoutId);
          console.log("Speech recognition service is available");
          
          // Set a shorter timeout to clean up the temp instance
          setTimeout(() => {
            cleanupTempRecognition();
          }, 1000);
          
          setServiceAvailable(true);
          setError('');
          setIsInitializing(false);
          // Don't set the "ready" status message here, as the user may not be ready to start
          setStatus('');
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts
          setIsCheckingService(false);
        };
        
        // Handle any errors during the check
        tempRecognitionRef.current.onerror = (event: any) => {
          clearTimeout(timeoutId);
          console.error("Speech recognition service check error:", event.error);
          
          // Don't fail the check for aborted, no-speech, or audio-capture errors
          // These don't necessarily mean the service is unavailable
          if (event.error === 'aborted' || 
              event.error === 'no-speech' || 
              event.error === 'audio-capture') {
            console.log("Ignoring non-critical error:", event.error);
            setServiceAvailable(true);
            setError('');
            setIsInitializing(false);
            setIsCheckingService(false);
            cleanupTempRecognition();
            return;
          }
          
          // For network errors, don't immediately assume service is down
          // It might be a temporary blip
          if (event.error === 'network') {
            console.log("Network error during check, but not assuming service is down");
            setServiceAvailable(true); // Still assume it might work
            setError('');
            setIsInitializing(false);
            setIsCheckingService(false);
            cleanupTempRecognition();
            return;
          }
          
          // For other errors, mark as potentially unavailable
          setServiceAvailable(false);
          setIsInitializing(false);
          setIsCheckingService(false);
          
          if (event.error === 'not-allowed') {
            setError("Microphone access denied. Please enable microphone permissions.");
          } else {
            // Don't show error to user for service issues,
            // just log to console and allow retry
            console.error(`Speech recognition service issue: ${event.error}`);
            setError('');
          }
          
          cleanupTempRecognition();
        };
        
        // Also handle the onend event to ensure we always reset state
        tempRecognitionRef.current.onend = () => {
          console.log("Temp recognition instance ended");
          setIsCheckingService(false);
          
          // If we haven't set serviceAvailable yet, assume it's working
          // This helps avoid false negatives
          if (serviceAvailable === null) {
            console.log("Recognition ended without error, assuming service is available");
            setServiceAvailable(true);
            setError('');
          }
        };
        
        // Start the temporary recognition to check
        tempRecognitionRef.current.start();
      } catch (error) {
        console.error("Error checking speech recognition service:", error);
        
        // Even if there's an error initializing, still assume service might work
        // Don't mark as unavailable to avoid false negatives
        setServiceAvailable(true);
        setError('');
        setIsInitializing(false);
        setIsCheckingService(false);
        
        cleanupTempRecognition();
      }
    } else {
      // No internet connection
      setServiceAvailable(false);
      setError("No internet connection. Speech recognition requires internet access.");
      setIsInitializing(false);
      setIsCheckingService(false);
    }
  };
  
  // Helper to clean up temporary recognition instance
  const cleanupTempRecognition = () => {
    if (tempRecognitionRef.current) {
      try {
        tempRecognitionRef.current.abort();
        tempRecognitionRef.current = null;
      } catch (err) {
        console.error("Error cleaning up temp recognition", err);
      }
    }
  };
  
  // Helper function to actually start listening after checks
  const proceedWithStartListening = async () => {
    // Only proceed if not already listening
    if (isListening) {
      return;
    }
    
    // Set a flag that we're about to start
    setStatus('Starting speech recognition...');
    
    // Check microphone availability first
    const micAvailable = await checkMicrophoneAvailability();
    if (!micAvailable) {
      setError('Microphone access denied or no microphone detected. Please check your device settings.');
      return;
    }
    
    try {
      // Set up our error handler for 'no-speech' to be more forgiving
      if (recognitionRef.current) {
        const originalErrorHandler = recognitionRef.current.onerror;
        recognitionRef.current.onerror = (event: any) => {
          // For no-speech, just provide a gentle reminder rather than an error
          if (event.error === 'no-speech') {
            setStatus('No speech detected. Please speak into your microphone.');
            return;
          }
          // Otherwise use the standard error handler
          if (originalErrorHandler) {
            originalErrorHandler(event);
          }
        };
      }
      
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start speech recognition. Please refresh the page and try again.');
      setIsListening(false);
      
      // Also mark service as potentially unavailable
      setServiceAvailable(false);
      setTimeout(() => {
        setShowRetryButton(true);
      }, 3000);
    }
  };
  
  // Update the handleSpeechRecognitionError function
  const handleSpeechRecognitionError = (event: any) => {
    console.error('Speech recognition error', event.error);
    
    // Special handling for non-critical errors
    if (event.error === 'aborted') {
      // This is usually user-initiated or from our own code, so just ignore it
      console.log("Recognition aborted, not treating as error");
      return;
    }
    
    if (event.error === 'no-speech') {
      // Just update the status instead of showing an error
      setStatus('No speech detected. Please speak into your microphone.');
      return;
    }
    
    if (event.error === 'audio-capture') {
      // This can happen temporarily sometimes, don't always show error
      console.log("Audio capture error, may be temporary");
      setStatus('Checking microphone...');
      // Try reconnecting automatically after a short delay
      setTimeout(() => {
        if (!isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (err) {
            console.error("Failed to restart after audio capture error:", err);
          }
        }
      }, 1000);
      return;
    }
    
    // Provide more specific error messages based on the error type
    let errorMessage = '';
    let shouldRetry = false;
    
    switch(event.error) {
      case 'network':
        // Check if we actually have internet connectivity before reporting a network error
        if (navigator.onLine) {
          console.warn("Network error but still online, assuming temporary blip");
          errorMessage = '';
          // Try to restart automatically
          setTimeout(() => {
            if (!isListening && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                console.log("Auto-restarted after network error");
              } catch (err) {
                console.error("Failed to auto-restart after network error:", err);
              }
            }
          }, 2000);
        } else {
          errorMessage = 'Network connection error. Please check your internet connection.';
        }
        shouldRetry = true;
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access denied. Please enable microphone permissions.';
        break;
      case 'service-not-allowed':
        // Don't show error message for this one, just try to restart
        console.warn("Service not allowed error, may be temporary");
        errorMessage = '';
        shouldRetry = true;
        break;
      default:
        // For other errors, don't show to user unless critical
        console.warn(`Speech recognition error: ${event.error}. Attempting to continue.`);
        errorMessage = '';
    }
    
    // Only set errors for real error conditions and only when we have text
    if (errorMessage) {
      setError(errorMessage);
      setIsListening(false);
      if (status === 'Listening...') {
        setStatus('Recognition paused. Click "Start Listening" to try again.');
      }
    }
    
    // Auto-retry for network errors after a short delay
    if (shouldRetry) {
      // Don't stack multiple retry attempts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // For network errors, try a different approach
      if (event.error === 'network' || event.error === 'service-not-allowed') {
        // Set a shorter timeout for first retry
        retryTimeoutRef.current = setTimeout(() => {
          // Don't show any message, just try to restart
          if (!isListening && recognitionRef.current) {
            try {
              console.log("Attempting auto-restart after service error");
              recognitionRef.current.start();
            } catch (err) {
              console.error("Failed auto-restart after service error:", err);
            }
          }
        }, 2000);
      } else {
        retryTimeoutRef.current = setTimeout(() => {
          if (event.error === 'network' && !navigator.onLine) {
            // If still offline, don't retry
            setError('Speech recognition requires internet. Please check your connection.');
          } else {
            if (!isListening && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.error("Failed auto-restart after general error:", err);
              }
            }
          }
        }, 3000);
      }
    }
  };
  
  // Update handleRetryClick to prevent overlapping service checks
  const handleRetryClick = () => {
    // Don't do anything if already checking the service
    if (isCheckingService) {
      return;
    }
    
    setError('Attempting to reconnect to speech recognition service...');
    setShowRetryButton(false);
    
    // Increment reconnect attempt counter
    reconnectAttemptsRef.current += 1;
    
    // Check if we've exceeded the maximum number of attempts
    if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
      setError('Maximum reconnection attempts reached. Please try again later or refresh the page.');
      // Reset counter but don't show retry button immediately
      reconnectAttemptsRef.current = 0;
      setTimeout(() => setShowRetryButton(true), 10000); // Wait 10 seconds before showing retry again
      return;
    }
    
    try {
      // First check the service availability
      checkSpeechRecognitionService();
      
      // Set up a delayed check for the result - only if we're not still checking
      // This timeout is longer than the service check timeout to ensure it's complete
      setTimeout(() => {
        if (!isCheckingService) {
          if (serviceAvailable) {
            // If service is available, reinitialize and start
            initializeSpeechRecognition();
            if (recognitionRef.current) {
              startListening();
            }
          } else if (!serviceAvailable && usingFallbackAPI) {
            // If service is not available and we're in fallback mode
            setError('Speech recognition service is still unavailable. Please try again later.');
            // Show retry button again after a delay based on attempt number
            const delayTime = Math.min(5000 * reconnectAttemptsRef.current, 30000);
            setTimeout(() => {
              setShowRetryButton(true);
            }, delayTime);
          }
        }
      }, 6000); // Wait 6 seconds for the service check to complete
      
      // Clear any existing retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    } catch (err) {
      console.error("Failed to manually reset speech recognition:", err);
      setError('Speech recognition service is still unavailable. Please try again later.');
      // Show retry button again after a delay
      setTimeout(() => {
        setShowRetryButton(true);
      }, 5000);
    }
  };
  
  return (
    <div className="voice-control-container">
      <div className="voice-control-header">
        <h2 className="voice-control-title">
          <MailAnimation width="36px" height="36px" className="mr-2" /> 
          Voice-Controlled Email Client
        </h2>
        {isInitializing && (
          <div className="initializing-indicator">
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
            <div className="initializing-text">Initializing speech recognition...</div>
          </div>
        )}
        <button className="close-button" onClick={onCancel}>&times;</button>
      </div>
      
      {/* Audio element for gTTS playback - with controls for debugging */}
      <audio 
        ref={audioRef} 
        src={audioSrc || ''} 
        controls={isReading} // Show controls when playing 
        style={{ display: isReading ? 'block' : 'none', marginBottom: '10px' }} 
      />
      
      {error && (
        <div className="error-message">
          <span>{error}</span>
          {showRetryButton && (
            <button className="retry-button" onClick={handleRetryClick}>
              Retry Connection
            </button>
          )}
        </div>
      )}
      
      {status && (
        <div className="status-message">
          {status.includes('Listening') && <MicrophoneAnimation width="20px" height="20px" className="mr-2" />}
          {status.includes('Speaking') && <TalkingAnimation width="20px" height="20px" className="mr-2" />}
          {status.includes('Processing') && <WavesAnimation width="40px" height="20px" className="mr-2" />}
          {status.includes('Success') && <CheckmarkAnimation width="20px" height="20px" className="mr-2" />}
          {status}
        </div>
      )}
      
      {mode === 'send' && step !== 'confirm' && (
        <div className="compose-container">
          <div className="compose-header">
            <div className="compose-header-text">New Message</div>
          </div>
          <div className="compose-content">
            {step === 'recipient' && (
              <div className="compose-field">
                <div className="compose-field-label">To:</div>
                <input
                  type="email"
                  value={recipient || formatEmailAddress(transcript)}
                  onChange={(e) => setRecipient(formatEmailAddress(e.target.value))}
                  className="compose-field-input"
                  placeholder="Recipient email address"
                  onClick={() => {
                    if (!isListening && !loading) {
                      startListening();
                    }
                  }}
                />
              </div>
            )}
            
            {(step === 'recipient' || step === 'subject') && (
              <div className="compose-field">
                <div className="compose-field-label">Subject:</div>
                <input
                  type="text"
                  value={subject || (step === 'subject' ? transcript : '')}
                  onChange={(e) => setSubject(e.target.value)}
                  className="compose-field-input"
                  placeholder="Email subject"
                  disabled={step !== 'subject'}
                  onClick={() => {
                    if (step === 'subject' && !isListening && !loading) {
                      startListening();
                    }
                  }}
                />
              </div>
            )}
            
            {(step === 'recipient' || step === 'subject' || step === 'body') && (
              <div className="compose-body">
                <textarea
                  value={body || (step === 'body' ? transcript : '')}
                  onChange={(e) => setBody(e.target.value)}
                  className="compose-body-input"
                  placeholder="Type your message here"
                  disabled={step !== 'body'}
                  onClick={() => {
                    if (step === 'body' && !isListening && !loading) {
                      startListening();
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="input-header">
            <div className="helper-text">
              {getStepInstructions()}
            </div>
            <div className="mic-container">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`mic-button ${isListening ? 'mic-active' : 'mic-inactive'}`}
                disabled={loading}
              >
                <MicrophoneAnimation 
                  width="24px" 
                  height="24px" 
                  color={isListening ? '#ef4444' : '#6366f1'} 
                />
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </button>
              <span 
                className={`mic-status ${isListening ? 'listening' : ''}`}
                onClick={isListening ? stopListening : startListening}
              >
                {/* Always show "Click to speak" when not listening */}
                {isListening ? 'Listening...' : 'Click to speak'}
              </span>
            </div>
          </div>
          
          <div className="compose-footer">
            {step === 'body' && (
              <button
                onClick={() => {
                  setStep('confirm');
                  stopListening();
                }}
                className="send-button"
                disabled={loading || !body.trim()}
              >
                Send
              </button>
            )}
            {step !== 'body' && (
              <button
                onClick={() => {
                  if (step === 'recipient' && recipient.trim()) {
                    setStep('subject');
                    stopListening();
                    setTimeout(() => startListening(), 500);
                  } else if (step === 'subject' && subject.trim()) {
                    setStep('body');
                    stopListening();
                    setTimeout(() => startListening(), 500);
                  }
                }}
                className="primary-button"
                disabled={loading || (step === 'recipient' ? !recipient.trim() : !subject.trim())}
              >
                Next
              </button>
            )}
            <button
              onClick={onCancel}
              className="secondary-button"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {mode === 'send' && step === 'confirm' && (
        <div className="email-container">
          <h3 className="email-header">Confirm Email</h3>
          <div className="email-meta">
            <div className="email-from">
              <span className="email-label">From:</span> {email}
            </div>
            <div className="email-from">
              <span className="email-label">To:</span> {formatEmailAddress(recipient)}
            </div>
            <div className="email-subject">
              <span className="email-label">Subject:</span> {subject}
            </div>
          </div>
          <div className="email-body">{body}</div>
          <div className="button-container">
            <button
              onClick={sendEmail}
              className="primary-button"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Confirm & Send'}
            </button>
            <button
              onClick={() => setStep('body')}
              className="secondary-button"
              disabled={loading}
            >
              Edit Message
            </button>
            <button
              onClick={onCancel}
              className="secondary-button"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {mode === 'read' && (
        <div className="email-list">
          {loading ? (
            <div className="loading-message">
              <p>Loading your unread emails...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={fetchUnreadEmails} className="primary-button">
                Try Again
              </button>
              <button onClick={onComplete} className="secondary-button">
                Back to Dashboard
              </button>
            </div>
          ) : unreadEmails.length > 0 ? (
            <div className="email-container">
              <div className="email-header">
                <div className="email-index">
                  Email {currentEmailIndex + 1} of {unreadEmails.length}
                </div>
                <div className="email-actions">
                  {isReading ? (
                    <button 
                      onClick={stopReading}
                      className="action-button stop-button"
                      title="Stop Reading"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="6" y="6" width="12" height="12" />
                      </svg>
                      Stop Reading
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => readEmailAloud(unreadEmails[currentEmailIndex], currentEmailIndex)}
                        className="action-button play-button"
                        title="Read Current Header"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Read Header
                      </button>
                      <button 
                        onClick={readAllHeaders}
                        className="action-button read-headers-button"
                        title="Read All Headers"
                      >
                        <WavesAnimation width="24px" height="16px" className="mr-1" />
                        Read All Headers
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => readFullEmail(unreadEmails[currentEmailIndex], currentEmailIndex)}
                    className="action-button play-full-button"
                    title="Read Full Email"
                    disabled={isReading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12h6m2 0h9"></path>
                      <path d="M18 6l3 6-3 6"></path>
                    </svg>
                    Read Full Email
                  </button>
                </div>
              </div>
              <div className="email-meta">
                <div className="email-from">
                  <span className="email-label">From:</span> {unreadEmails[currentEmailIndex].from}
                </div>
                <div className="email-subject">
                  <span className="email-label">Subject:</span> {unreadEmails[currentEmailIndex].subject}
                </div>
                <div className="email-date">
                  <span className="email-label">Date:</span> {unreadEmails[currentEmailIndex].date}
                </div>
              </div>
              <div className="email-body-toggle">
                <button 
                  onClick={() => setShowFullBody(!showFullBody)}
                  className="toggle-button"
                >
                  {showFullBody ? 'Show Preview' : 'Show Full Message'}
                </button>
              </div>
              <div className="email-body" style={{
                maxHeight: showFullBody ? 'none' : '200px',
                overflow: showFullBody ? 'visible' : 'hidden',
                position: 'relative'
              }}>
                {unreadEmails[currentEmailIndex].body}
                {!showFullBody && unreadEmails[currentEmailIndex].body.length > 300 && (
                  <div className="fade-overlay"></div>
                )}
              </div>
              <div className="navigation-buttons">
                <button
                  onClick={() => {
                    stopReading();
                    if (currentEmailIndex > 0) {
                      setCurrentEmailIndex(currentEmailIndex - 1);
                      setShowFullBody(false);
                    }
                  }}
                  className="secondary-button"
                  disabled={currentEmailIndex === 0 || loading}
                >
                  Previous
                </button>
                <button
                  onClick={onComplete}
                  className="primary-button"
                >
                  Done
                </button>
                <button
                  onClick={() => {
                    stopReading();
                    if (currentEmailIndex < unreadEmails.length - 1) {
                      setCurrentEmailIndex(currentEmailIndex + 1);
                      setShowFullBody(false);
                    }
                  }}
                  className="secondary-button"
                  disabled={currentEmailIndex === unreadEmails.length - 1 || loading}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-message">
              <p>No unread emails found.</p>
              <button onClick={fetchUnreadEmails} className="primary-button">
                Refresh
              </button>
              <button onClick={onComplete} className="secondary-button">
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceControl; 