
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure we're using the correct date for development/testing
if (process.env.NODE_ENV === 'development') {
  console.log('Current date:', new Date().toISOString());
}

createRoot(document.getElementById("root")!).render(<App />);
