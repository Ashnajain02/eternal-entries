import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { JournalProvider } from "./contexts/JournalContext";
import { AuthProvider } from "./contexts/AuthContext";
import { DraftsProvider } from "./contexts/DraftsContext";
import Index from "./pages/Index";
import Archive from "./pages/Archive";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import Habits from "./pages/Habits";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Callback from "./pages/Callback";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <JournalProvider>
          <DraftsProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/callback" element={<Callback />} />
                <Route path="/" element={<Index />} />
                <Route 
                  path="/archive" 
                  element={
                    <ProtectedRoute>
                      <Archive />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/habits" 
                  element={
                    <ProtectedRoute>
                      <Habits />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DraftsProvider>
        </JournalProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
