import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './EmailDashboard.css';

// Backend API base URL
const API_BASE_URL = 'http://localhost:5001';

interface Email {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
}

interface UserData {
  username: string;
  // Add other user data properties as needed
}

const EmailDashboard: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [newEmail, setNewEmail] = useState({ to: '', subject: '', body: '' });
  const [emailError, setEmailError] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [commandFeedback, setCommandFeedback] = useState('');
  const [userData, setUserData] = useState<UserData>({ username: '' });

  const handleVoiceCommand = async (command: string) => {
    try {
      console.log(`Sending voice command to server: ${command}`);
      const response = await axios.post(
        `${API_BASE_URL}/api/voice-command`, 
        { command, username: userData.username },
        { timeout: 10000 }
      );
      
      console.log('Voice command response:', response.data);
      
      // Handle different command responses
      if (response.data.action === 'refresh') {
        setCommandFeedback('Refreshing emails...');
        fetchEmails();
      } else if (response.data.action === 'read' && response.data.emailId) {
        const emailToRead = emails.find(email => email.id === response.data.emailId);
        if (emailToRead) {
          setSelectedEmail(emailToRead);
          setCommandFeedback(`Reading email from ${emailToRead.sender}`);
        }
      } else if (response.data.action === 'compose') {
        setIsComposing(true);
        setCommandFeedback('Opening compose email form...');
      } else if (response.data.action === 'send' && isComposing) {
        handleSendEmail();
        setCommandFeedback('Sending email...');
      } else {
        setCommandFeedback(response.data.message || 'Command processed.');
      }
      
      // Clear feedback after 3 seconds
      setTimeout(() => setCommandFeedback(''), 3000);
    } catch (error) {
      console.error('Error processing voice command:', error);
      setCommandFeedback('Error processing voice command. Please try again.');
      
      // Clear feedback after 3 seconds
      setTimeout(() => setCommandFeedback(''), 3000);
    }
  };

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const response = await axios.get<Email[]>(`${API_BASE_URL}/api/emails`, {
        params: { username: userData.username },
        timeout: 5000
      });
      console.log('Fetched emails:', response.data);
      setEmails(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError('Failed to load emails. Please try again later.');
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!newEmail.to || !newEmail.subject) {
      setEmailError('Please enter recipient and subject');
      return;
    }
    
    setSending(true);
    setEmailError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/send-email`, {
        ...newEmail,
        from: userData.username
      });
      
      console.log('Email sent response:', response.data);
      setSending(false);
      
      if (response.data.success) {
        // Reset the form
        setNewEmail({ to: '', subject: '', body: '' });
        setIsComposing(false);
        setFeedback('Email sent successfully!');
        
        // Refresh emails list
        fetchEmails();
        
        // Clear feedback after 3 seconds
        setTimeout(() => setFeedback(''), 3000);
      } else {
        setEmailError(response.data.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setSending(false);
      setEmailError('Error sending email. Please try again.');
    }
  };

  return (
    <div className="email-dashboard">
      {/* Email dashboard content will go here */}
    </div>
  );
};

export default EmailDashboard;