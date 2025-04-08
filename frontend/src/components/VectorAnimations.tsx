import React from 'react';

interface AnimationProps {
  width?: string;
  height?: string;
  color?: string;
  secondaryColor?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<AnimationProps> = ({ 
  width = '40px', 
  height = '40px', 
  color = '#6366f1',
  className = '' 
}) => {
  return (
    <div
      className={`inline-block ${className}`}
      style={{ width, height }}
      role="status"
      aria-label="Loading"
    >
      <svg
        className="animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill={color}
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
};

export const MicrophoneAnimation: React.FC<AnimationProps> = ({ 
  width = '24px', 
  height = '24px', 
  color = '#ef4444',
  className = '' 
}) => {
  return (
    <div
      className={`inline-block ${className}`}
      style={{ width, height }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={color}
        width="100%"
        height="100%"
      >
        <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z">
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M11 3.99h2v-2h-2v2zm-1.07 16.01H7.93c-.45 0-.67-.54-.35-.85l1.17-1.17c.19-.19.51-.19.7 0l1.14 1.14c.32.32.1.88-.36.88zm6.14 0h-2v-2h2v2z">
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
        <g>
          <path d="M19 11h-1.7c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72z">
            <animate
              attributeName="opacity"
              values="0.6;1;0.6"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </svg>
    </div>
  );
};

export const MailAnimation: React.FC<AnimationProps> = ({ 
  width = '60px', 
  height = '60px', 
  color = '#6366f1',
  secondaryColor = '#10b981',
  className = '' 
}) => {
  return (
    <div
      className={`inline-block ${className}`}
      style={{ width, height }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke={color} strokeWidth="2">
          <animate
            attributeName="y"
            values="4;5;4"
            dur="2s"
            repeatCount="indefinite"
          />
        </rect>
        <path 
          d="M22 8l-10 5-10-5" 
          fill="none" 
          stroke={secondaryColor} 
          strokeWidth="2"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            values="M22 8l-10 5-10-5;M22 7l-10 6-10-6;M22 8l-10 5-10-5"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
};

export const CheckmarkAnimation: React.FC<AnimationProps> = ({ 
  width = '40px', 
  height = '40px', 
  color = '#10b981',
  className = '' 
}) => {
  return (
    <div
      className={`inline-block ${className}`}
      style={{ width, height }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14">
          <animate
            attributeName="stroke-dasharray"
            from="0 100"
            to="100 100"
            dur="1s"
            begin="0s"
            fill="freeze"
          />
        </path>
        <polyline points="22 4 12 14.01 9 11.01">
          <animate
            attributeName="stroke-dasharray"
            from="0 30"
            to="30 30"
            dur="0.5s"
            begin="0.6s"
            fill="freeze"
          />
        </polyline>
      </svg>
    </div>
  );
};

export const WavesAnimation: React.FC<AnimationProps> = ({ 
  width = '80px', 
  height = '40px', 
  color = '#3b82f6',
  className = '' 
}) => {
  return (
    <div
      className={`inline-block ${className}`}
      style={{ width, height }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 50"
        width="100%"
        height="100%"
      >
        <path
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          d="M10 25 C15 15, 20 5, 30 15 C40 25, 50 15, 60 5 C70 -5, 80 15, 90 25"
        >
          <animate
            attributeName="d"
            values="
              M10 25 C15 15, 20 5, 30 15 C40 25, 50 15, 60 5 C70 -5, 80 15, 90 25;
              M10 25 C15 35, 20 45, 30 35 C40 25, 50 35, 60 45 C70 55, 80 35, 90 25;
              M10 25 C15 15, 20 5, 30 15 C40 25, 50 15, 60 5 C70 -5, 80 15, 90 25
            "
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
};

export const PulseAnimation: React.FC<AnimationProps> = ({ 
  width = '40px', 
  height = '40px', 
  color = '#ef4444',
  className = '' 
}) => {
  return (
    <div
      className={`inline-block ${className}`}
      style={{ width, height }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10">
          <animate
            attributeName="r"
            values="8;10;8"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-width"
            values="2;1;2"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            values="1;0.6;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="12" cy="12" r="5" fill={color}>
          <animate
            attributeName="r"
            values="4;5;4"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="fill-opacity"
            values="1;0.8;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
};

export const BounceAnimation: React.FC<AnimationProps> = ({
  width = '60px',
  height = '40px',
  color = '#6366f1',
  className = ''
}) => {
  return (
    <div
      className={`inline-block ${className}`}
      style={{ width, height }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 40"
        width="100%"
        height="100%"
      >
        <circle cx="20" cy="20" r="8" fill={color} opacity="0.8">
          <animate
            attributeName="cy"
            values="20;10;20"
            dur="1s"
            repeatCount="indefinite"
            begin="0s"
          />
        </circle>
        <circle cx="60" cy="20" r="8" fill={color} opacity="0.8">
          <animate
            attributeName="cy"
            values="20;10;20"
            dur="1s"
            repeatCount="indefinite"
            begin="0.2s"
          />
        </circle>
        <circle cx="100" cy="20" r="8" fill={color} opacity="0.8">
          <animate
            attributeName="cy"
            values="20;10;20"
            dur="1s"
            repeatCount="indefinite"
            begin="0.4s"
          />
        </circle>
      </svg>
    </div>
  );
};

export const TalkingAnimation: React.FC<AnimationProps> = ({
  width = '60px',
  height = '60px',
  color = '#3b82f6',
  secondaryColor = '#a5b4fc',
  className = ''
}) => {
  return (
    <div
      className={`inline-block ${className}`}
      style={{ width, height }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
      >
        <rect x="4" y="12" width="3" height="8" rx="1" fill={color}>
          <animate
            attributeName="height"
            values="3;8;3"
            dur="0.8s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="y"
            values="14.5;12;14.5"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </rect>
        <rect x="9" y="9" width="3" height="14" rx="1" fill={color}>
          <animate
            attributeName="height"
            values="6;14;6"
            dur="0.8s"
            repeatCount="indefinite"
            begin="0.2s"
          />
          <animate
            attributeName="y"
            values="13;9;13"
            dur="0.8s"
            repeatCount="indefinite"
            begin="0.2s"
          />
        </rect>
        <rect x="14" y="7" width="3" height="10" rx="1" fill={color}>
          <animate
            attributeName="height"
            values="4;10;4"
            dur="0.8s"
            repeatCount="indefinite"
            begin="0.4s"
          />
          <animate
            attributeName="y"
            values="10;7;10"
            dur="0.8s"
            repeatCount="indefinite"
            begin="0.4s"
          />
        </rect>
        <rect x="19" y="11" width="3" height="6" rx="1" fill={color}>
          <animate
            attributeName="height"
            values="2;6;2"
            dur="0.8s"
            repeatCount="indefinite"
            begin="0.6s"
          />
          <animate
            attributeName="y"
            values="13;11;13"
            dur="0.8s"
            repeatCount="indefinite"
            begin="0.6s"
          />
        </rect>
      </svg>
    </div>
  );
};

export default {
  LoadingSpinner,
  MicrophoneAnimation,
  MailAnimation,
  CheckmarkAnimation,
  WavesAnimation,
  PulseAnimation,
  BounceAnimation,
  TalkingAnimation
}; 