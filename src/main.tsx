
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Set the runtime date for testing - ONLY FOR DEVELOPMENT
// This allows us to control what "today" is for testing purposes
// Remove this in production
const today = new Date(2025, 4, 7); // May 7, 2025 (months are 0-based)
Date.now = () => today.getTime();

createRoot(document.getElementById("root")!).render(<App />);
