import React, { useEffect, useState } from 'react';

const RootLoading: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  
  // Ensure the component is properly mounted before showing content
  useEffect(() => {
    setMounted(true);
    
    // Apply a body class during loading to prevent conflicts
    document.body.classList.add('loading-active');
    
    // Clean up when component unmounts
    return () => {
      document.body.classList.remove('loading-active');
    };
  }, []);
  
  return (
    <div className="root-loading" style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#010409',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      <div className="stars-container" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}>
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>
      
      <div className="loading-message" style={{
        textAlign: 'center',
        zIndex: 10,
        padding: '2rem',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '10px',
        backdropFilter: 'blur(5px)'
      }}>
        <h1 style={{
          marginBottom: '1.5rem',
          fontSize: '2rem',
          color: '#ffffff'
        }}>The Eternal Return of the Digital Self</h1>
        
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          borderTop: '4px solid #ffffff',
          animation: 'spin 1s linear infinite',
          margin: '20px auto'
        }}></div>
        
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          marginTop: '1rem',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.5s ease-in'
        }}>Loading experience...</p>
      </div>
    </div>
  );
};

export default RootLoading;