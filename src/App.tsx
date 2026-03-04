import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import Login from "./pages/Login";
import Info from "./pages/Info";
import Uitslag from "./pages/Uitslag";
import Intake from "./pages/Intake";
import Accommodations from "./pages/Accommodations";
import AccommodationDetail from "./pages/AccommodationDetail";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Laden...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/uitslag" replace /> : <Login />} />
      <Route path="/" element={<Navigate to={user ? "/uitslag" : "/login"} replace />} />
      <Route path="/uitslag" element={<ProtectedRoute><Uitslag /></ProtectedRoute>} />
      <Route path="/info" element={<ProtectedRoute><Info /></ProtectedRoute>} />
      <Route path="/intake" element={<ProtectedRoute><Intake /></ProtectedRoute>} />
      <Route path="/accommodations" element={<ProtectedRoute><Accommodations /></ProtectedRoute>} />
      <Route path="/accommodations/:id" element={<ProtectedRoute><AccommodationDetail /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ActivityLogProvider>
            <AppRoutes />
          </ActivityLogProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
