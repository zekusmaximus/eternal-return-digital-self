import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Lazy load the main App component
const App = lazy(() => import('./app'));

// Import loading component from separate file for better Fast Refresh
import RootLoading from './components/Loading/RootLoading';

// Initialize analytics or other non-critical services
const initializeServices = async () => {
  // This would be the place to load any non-critical services
  // that shouldn't block the initial render
  
  // Example: analytics, monitoring, etc.
  if (process.env.NODE_ENV === 'production') {
    // Dynamically import analytics only in production
    try {
      // const analytics = await import('./services/analytics');
      // analytics.initialize();
      console.log('Production services initialized');
    } catch (error) {
      console.error('Failed to load production services:', error);
    }
  }
};

// Start initializing services in the background
initializeServices();

// Render the application
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={<RootLoading />}>
      <App />
    </Suspense>
  </React.StrictMode>
);