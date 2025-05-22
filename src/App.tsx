
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { JournalProvider } from './contexts/journal/JournalContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import Index from './pages/Index';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import PasswordReset from './pages/PasswordReset';
import PasswordUpdate from './pages/PasswordUpdate';
import NotFound from './pages/NotFound';
import Stats from './pages/Stats';
import Archive from './pages/Archive';

const App: React.FC = () => {
  useEffect(() => {
    document.body.className = 'dark'; // force dark mode
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <JournalProvider>
          <Router>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/password-reset" element={<PasswordReset />} />
              <Route path="/password-update" element={<PasswordUpdate />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stats"
                element={
                  <ProtectedRoute>
                    <Stats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/archive"
                element={
                  <ProtectedRoute>
                    <Archive />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </JournalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
