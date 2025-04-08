import { useState, useEffect } from 'react';
import axios from 'axios';
import FacialAuth from './components/FacialAuth';
import SignUp from './components/SignUp';
import AddAccount from './components/AddAccount';
import VoiceControl from './components/VoiceControl';
import './App.css';

// API base URL
const API_BASE_URL = 'http://localhost:5001';

interface EmailAccount {
  email: string;
  isDefault: boolean;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [currentView, setCurrentView] = useState<'dashboard' | 'add-account' | 'send-email' | 'read-emails'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [pageAnimation, setPageAnimation] = useState('fadeIn');
  const [username, setUsername] = useState<string>('');
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'dark'
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });
  
  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Toggle theme function
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };
  
  // Fetch accounts on initial load
  useEffect(() => {
    if (isAuthenticated && username) {
      fetchAccounts();
    }
  }, [isAuthenticated, username]);
  
  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/accounts?username=${encodeURIComponent(username)}`);
      setAccounts(response.data.accounts || []);
      if (response.data.accounts?.length > 0) {
        // Set the default account as selected, or the first one if no default
        const defaultAccount = response.data.accounts.find((acc: EmailAccount) => acc.isDefault);
        setSelectedAccount(defaultAccount ? defaultAccount.email : response.data.accounts[0].email);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAuthSuccess = (authenticatedUsername: string) => {
    setUsername(authenticatedUsername);
    setPageAnimation('slideOut');
    setTimeout(() => {
      setIsAuthenticated(true);
      setPageAnimation('slideIn');
    }, 300);
  };
  
  const handleAccountAdded = () => {
    fetchAccounts();
    setPageAnimation('slideOut');
    setTimeout(() => {
      setCurrentView('dashboard');
      setPageAnimation('slideIn');
    }, 300);
  };
  
  const handleActionComplete = () => {
    setPageAnimation('slideOut');
    setTimeout(() => {
      setCurrentView('dashboard');
      setPageAnimation('slideIn');
    }, 300);
  };

  const handleSwitchToSignUp = () => {
    setPageAnimation('slideOut');
    setTimeout(() => {
      setAuthMode('signup');
      setPageAnimation('slideIn');
    }, 300);
  };

  const handleSwitchToLogin = () => {
    setPageAnimation('slideOut');
    setTimeout(() => {
      setAuthMode('login');
      setPageAnimation('slideIn');
    }, 300);
  };

  const handleSignUpSuccess = (newUsername: string) => {
    setUsername(newUsername);
    setPageAnimation('slideOut');
    setTimeout(() => {
      setAuthMode('login');
      setIsAuthenticated(true);
      setCurrentView('add-account');
      setPageAnimation('slideIn');
    }, 300);
  };
  
  const handleChangeView = (view: 'dashboard' | 'add-account' | 'send-email' | 'read-emails') => {
    setPageAnimation('slideOut');
    setTimeout(() => {
      setCurrentView(view);
      setPageAnimation('slideIn');
    }, 300);
  };
  
  const handleLogout = () => {
    setPageAnimation('slideOut');
    setTimeout(() => {
      setIsAuthenticated(false);
      setUsername('');
      setAccounts([]);
      setSelectedAccount('');
      setPageAnimation('slideIn');
    }, 300);
  };
  
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <h1 className="app-title">Voice Email Assistant</h1>
            {isAuthenticated && (
              <div className="header-actions">
                <button
                  onClick={toggleTheme}
                  className="theme-toggle-button"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button
                  onClick={handleLogout}
                  className="logout-button"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="main-content">
        <div className="container">
          {!isAuthenticated ? (
            <div className={`auth-container ${pageAnimation}`}>
              <div className="welcome-card">
                <h2 className="welcome-title">Welcome to Voice Email Assistant</h2>
                <p className="welcome-text">
                  Control your emails with voice commands! Please authenticate with your face to continue.
                </p>
              </div>
              
              {authMode === 'login' ? (
                <FacialAuth 
                  onAuthSuccess={handleAuthSuccess} 
                  onSwitchToSignUp={handleSwitchToSignUp}
                />
              ) : (
                <SignUp 
                  onSignUpSuccess={handleSignUpSuccess}
                  onSwitchToLogin={handleSwitchToLogin}
                />
              )}
            </div>
          ) : (
            <div className={`dashboard-container ${pageAnimation}`}>
              {currentView === 'dashboard' && (
                <div>
                  <div className="accounts-card">
                    <h2 className="section-title">Your Email Accounts</h2>
                    
                    {accounts.length === 0 ? (
                      <div className="empty-accounts">
                        <p className="empty-text">You don't have any email accounts added yet.</p>
                        <button
                          onClick={() => handleChangeView('add-account')}
                          className="add-account-button"
                        >
                          Add Your First Account
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="account-select-container">
                          <label className="account-select-label" htmlFor="account-select">
                            Select Account
                          </label>
                          <select
                            id="account-select"
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            className="account-select"
                          >
                            {accounts.map((account) => (
                              <option key={account.email} value={account.email}>
                                {account.email} {account.isDefault ? '(Default)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="action-buttons">
                          <button
                            onClick={() => handleChangeView('send-email')}
                            disabled={!selectedAccount}
                            className={`action-button ${!selectedAccount ? 'disabled' : 'action-button-primary'}`}
                            aria-label="Send Email"
                          >
                            <svg className="action-icon" style={{color: !selectedAccount ? 'var(--gray-400)' : 'var(--info-color)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="action-title">Send Email</span>
                            <span className="action-description">Use your voice to dictate and send an email</span>
                          </button>
                          
                          <button
                            onClick={() => handleChangeView('read-emails')}
                            disabled={!selectedAccount}
                            className={`action-button ${!selectedAccount ? 'disabled' : 'action-button-secondary'}`}
                            aria-label="Read Unread Emails"
                          >
                            <svg className="action-icon" style={{color: !selectedAccount ? 'var(--gray-400)' : 'var(--secondary-color)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                            </svg>
                            <span className="action-title">Read Unread Emails</span>
                            <span className="action-description">Listen to your unread emails from last 24 hours</span>
                          </button>
                        </div>
                        
                        <div className="text-center">
                          <button
                            onClick={() => handleChangeView('add-account')}
                            className="add-another-button"
                            aria-label="Add Another Account"
                          >
                            Add Another Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {currentView === 'add-account' && (
                <AddAccount
                  onAccountAdded={handleAccountAdded}
                  username={username}
                />
              )}
              
              {currentView === 'send-email' && (
                <VoiceControl
                  email={selectedAccount}
                  mode="send"
                  onComplete={handleActionComplete}
                  onCancel={handleActionComplete}
                  username={username}
                />
              )}
              
              {currentView === 'read-emails' && (
                <VoiceControl
                  email={selectedAccount}
                  mode="read"
                  onComplete={handleActionComplete}
                  onCancel={handleActionComplete}
                  username={username}
                />
              )}
            </div>
          )}
        </div>
      </main>
      
      <footer className="app-footer">
        <div className="container">
          <div className="footer-content">
            <p className="footer-copyright">&copy; {new Date().getFullYear()} Voice Email Assistant. All rights reserved.</p>
            <p className="footer-tagline">
              Built with React, Python and voice recognition technology
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
