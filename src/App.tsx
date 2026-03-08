import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TripProvider, useTrip } from "@/contexts/TripContext";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import JoinTrip from "./pages/JoinTrip";
import Profiel from "./pages/Profiel";
import Info from "./pages/Info";
import Uitslag from "./pages/Uitslag";
import Intake from "./pages/Intake";
import Accommodations from "./pages/Accommodations";
import AccommodationDetail from "./pages/AccommodationDetail";
import Admin from "./pages/Admin";
import Taken from "./pages/Taken";
import TaskContext from "./pages/TaskContext";
import Kosten from "./pages/Kosten";
import Wensen from "./pages/Wensen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function TripGuard({ children }: { children: React.ReactNode }) {
  const { activeTrip, loading, userTrips } = useTrip();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Laden...</div>;
  // No trips → onboarding
  if (!activeTrip && userTrips.length === 0) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Laden...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/taken" replace /> : <Login />} />
      <Route path="/" element={<Navigate to={user ? "/taken" : "/login"} replace />} />
      <Route path="/join/:inviteCode" element={<JoinTrip />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/uitslag" element={<ProtectedRoute><TripGuard><Uitslag /></TripGuard></ProtectedRoute>} />
      <Route path="/info" element={<ProtectedRoute><TripGuard><Info /></TripGuard></ProtectedRoute>} />
      <Route path="/intake" element={<ProtectedRoute><TripGuard><Intake /></TripGuard></ProtectedRoute>} />
      <Route path="/accommodations" element={<ProtectedRoute><TripGuard><Accommodations /></TripGuard></ProtectedRoute>} />
      <Route path="/accommodations/:id" element={<ProtectedRoute><TripGuard><AccommodationDetail /></TripGuard></ProtectedRoute>} />
      <Route path="/taken" element={<ProtectedRoute><TripGuard><Taken /></TripGuard></ProtectedRoute>} />
      <Route path="/taken/:section" element={<ProtectedRoute><TripGuard><TaskContext /></TripGuard></ProtectedRoute>} />
      <Route path="/kosten" element={<ProtectedRoute><TripGuard><Kosten /></TripGuard></ProtectedRoute>} />
      <Route path="/wensen" element={<ProtectedRoute><TripGuard><Wensen /></TripGuard></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><TripGuard><Admin /></TripGuard></ProtectedRoute>} />
      <Route path="/profiel" element={<ProtectedRoute><Profiel /></ProtectedRoute>} />
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
          <TripProvider>
            <ActivityLogProvider>
              <AppRoutes />
            </ActivityLogProvider>
          </TripProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
