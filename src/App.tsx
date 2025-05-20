
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { JournalProvider } from '@/contexts/JournalContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import Index from '@/pages/Index';
import Stats from '@/pages/Stats';
import Archive from '@/pages/Archive';
import Settings from '@/pages/Settings';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';
import Callback from '@/pages/Callback';

import '@/App.css';

// Create a client for React Query
const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <JournalProvider>
            <Router>
              <Routes>
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
                <Route path="/archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/callback" element={<Callback />} />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Router>
          </JournalProvider>
        </AuthProvider>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
