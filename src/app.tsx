import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from './store/hooks'; // Ensure './store/hooks' exists or correct the path
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { initializeNodes } from './store/slices/nodesSlice';
import { selectViewMode } from './store/slices/interfaceSlice';
import ConstellationView from './components/Constellation/ConstellationView';
import NodeView from './components/NodeView/NodeView';
import './App.css';

// Inner App component that uses Redux hooks
function AppContent() {
  const dispatch = useAppDispatch();
  const viewMode = useSelector(selectViewMode);
  
  // Initialize nodes on mount
  useEffect(() => {
    dispatch(initializeNodes());
  }, [dispatch]);
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">The Eternal Return of the Digital Self</h1>
      </header>
      <div className="stars-container">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>
      {viewMode === 'constellation' ? (
        <ConstellationView />
      ) : (
        <NodeView />
      )}
    </div>
  );
}

// Main App component with Redux providers
function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

export default App;