import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AddAccount.css';

// Backend API base URL
const API_BASE_URL = 'http://localhost:5001';

interface AddAccountProps {
  onAccountAdded: () => void;
  username: string;
}

interface EmailAccount {
  email: string;
  isDefault: boolean;
}

const AddAccount: React.FC<AddAccountProps> = ({ onAccountAdded, username }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingAccounts, setExistingAccounts] = useState<EmailAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchExistingAccounts();
  }, [username]);

  const fetchExistingAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/accounts`, {
        params: { username }
      });
      setExistingAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/accounts`, {
        email,
        password,
        username
      });
      
      setSuccess('Account added successfully!');
      setEmail('');
      setPassword('');
      setShowAddForm(false);
      
      // Refresh the accounts list
      await fetchExistingAccounts();
      
      // Notify parent component
      onAccountAdded();
    } catch (error: any) {
      console.error('Error adding account:', error);
      
      if (error.response) {
        if (error.response.status === 400 && error.response.data.error) {
          setError(error.response.data.error);
        } else if (error.response.status === 401) {
          setError('Authentication failed. Please check your email and app password.');
        } else if (email.includes('gmail.com')) {
          setError('Failed to add Gmail account. Make sure you\'re using an App Password and not your regular password. Generate an App Password in your Google Account security settings.');
        } else {
          setError(`Failed to add account: ${error.response.data.error || error.response.statusText}`);
        }
      } else if (error.request) {
        setError('No response from server. Please check if the backend server is running.');
      } else {
        setError('Failed to add account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-account-container">
      <h2 className="add-account-title">Email Accounts</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {existingAccounts.length > 0 && (
        <div className="existing-accounts">
          <h3>Your Email Accounts</h3>
          <ul className="accounts-list">
            {existingAccounts.map((account, index) => (
              <li key={index} className="account-item">
                <span className="account-email">{account.email}</span>
                {account.isDefault && <span className="default-badge">Default</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!showAddForm && (
        <button 
          className="add-new-account-button"
          onClick={() => setShowAddForm(true)}
        >
          Add New Account
        </button>
      )}
      
      {showAddForm && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="your.email@example.com"
              disabled={isLoading}
              required
            />
            <p className="form-helper-text">
              Enter the email address you want to use for sending and reading emails.
            </p>
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              App Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••••••••••"
              disabled={isLoading}
              required
            />
            <p className="form-helper-text">
              Use an app-specific password for security. For Gmail, generate one in your Google Account settings.
            </p>
          </div>
          
          {email.includes('gmail.com') && (
            <div className="gmail-instructions">
              <h3 className="gmail-instructions-title">Gmail App Password Instructions:</h3>
              <ol className="gmail-instructions-list">
                <li>Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">Google Account Security Settings</a></li>
                <li>Enable 2-Step Verification if not already enabled</li>
                <li>Go to "App passwords" (under "Signing in to Google")</li>
                <li>Select "Mail" as the app and your device name</li>
                <li>Click "Generate" and copy the 16-character password</li>
                <li>Use this password instead of your regular Google password</li>
              </ol>
            </div>
          )}
          
          <div className="button-container">
            <button
              type="submit"
              disabled={isLoading}
              className="submit-button"
            >
              {isLoading ? 'Adding...' : 'Add Account'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddAccount; 