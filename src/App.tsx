import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TripProvider, useTrip } from "@/contexts/TripContext";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import Login from "./pages/Login";

// Lazy-loaded pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const JoinTrip = lazy(() => import("./pages/JoinTrip"));
const Profiel = lazy(() => import("./pages/Profiel"));
const Info = lazy(() => import("./pages/Info"));
const Uitslag = lazy(() => import("./pages/Uitslag"));
const Intake = lazy(() => import("./pages/Intake"));
const Accommodations = lazy(() => import("./pages/Accommodations"));
const AccommodationDetail = lazy(() => import("./pages/AccommodationDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const Taken = lazy(() => import("./pages/Taken"));
const Reisplanner = lazy(() => import("./pages/Reisplanner"));
const TaskContext = lazy(() => import("./pages/TaskContext"));
const Kosten = lazy(() => import("./pages/Kosten"));
const Wensen = lazy(() => import("./pages/Wensen"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Laden...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function TripGuard({ children }: { children: React.ReactNode }) {
  const { activeTrip, loading, userTrips } = useTrip();
  if (loading) return <PageLoader />;
  if (!activeTrip && userTrips.length === 0) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/reisplanner" element={<ProtectedRoute><TripGuard><Reisplanner /></TripGuard></ProtectedRoute>} />
        <Route path="/taken/:section" element={<ProtectedRoute><TripGuard><TaskContext /></TripGuard></ProtectedRoute>} />
        <Route path="/kosten" element={<ProtectedRoute><TripGuard><Kosten /></TripGuard></ProtectedRoute>} />
        <Route path="/wensen" element={<ProtectedRoute><TripGuard><Wensen /></TripGuard></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><TripGuard><Admin /></TripGuard></ProtectedRoute>} />
        <Route path="/profiel" element={<ProtectedRoute><Profiel /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
