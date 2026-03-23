import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { JournalProvider } from "./contexts/JournalContext";
import { AuthProvider } from "./contexts/AuthContext";
import { DraftsProvider } from "./contexts/DraftsContext";
import Index from "./pages/Index";
import Memories from "./pages/Memories";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import Habits from "./pages/Habits";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import About from "./pages/About";
import { useVisitLogger } from "./hooks/useVisitLogger";
const queryClient = new QueryClient();

const VisitLogger = ({ children }: { children: React.ReactNode }) => {
  useVisitLogger();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <VisitLogger>
          <JournalProvider>
            <DraftsProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/" element={<Index />} />
                  <Route
                    path="/memories"
                    element={
                      <ProtectedRoute>
                        <Memories />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/archive" element={<Navigate to="/memories" replace />} />
                  <Route path="/callback" element={<Navigate to="/" replace />} />
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
        </VisitLogger>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
