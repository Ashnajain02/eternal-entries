
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure we're using the correct date for development/testing
if (process.env.NODE_ENV === 'development') {
  console.log('Current date in ISO format:', new Date().toISOString());
  console.log('Current date in local format:', new Date().toLocaleDateString());
  console.log('Current date in en-CA format:', new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD format
}

createRoot(document.getElementById("root")!).render(<App />);
