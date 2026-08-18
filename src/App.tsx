import { lazy, ReactNode, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TripProvider, useTrip } from "@/contexts/TripContext";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import Login from "./pages/Login";

const Trips = lazy(() => import("./pages/Trips"));
const NewTrip = lazy(() => import("./pages/NewTrip"));
const TripHome = lazy(() => import("./pages/TripHome"));
const TripReis = lazy(() => import("./pages/TripReis"));
const TripSamen = lazy(() => import("./pages/TripSamen"));
const TripSettings = lazy(() => import("./pages/TripSettings"));
const JoinTrip = lazy(() => import("./pages/JoinTrip"));
const Profiel = lazy(() => import("./pages/Profiel"));

// Legacy prototype pages remain reachable only through explicit /legacy/:tripId routes
// while their useful data is migrated to generic product domains in later builds.
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Laden...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function TripRouteGuard({ children }: { children: ReactNode }) {
  const { tripId } = useParams<{ tripId: string }>();
  const { activeTrip, openTrip } = useTrip();
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");

  useEffect(() => {
    if (!tripId) {
      setStatus("denied");
      return;
    }

    if (activeTrip?.id === tripId) {
      setStatus("ready");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    openTrip(tripId).then((trip) => {
      if (!cancelled) setStatus(trip ? "ready" : "denied");
    });

    return () => {
      cancelled = true;
    };
  }, [tripId, activeTrip?.id, openTrip]);

  if (status === "loading") return <PageLoader />;
  if (status === "denied") return <Navigate to="/trips" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/trips" replace /> : <Login />} />
        <Route path="/" element={<Navigate to={user ? "/trips" : "/login"} replace />} />
        <Route path="/boot" element={<Navigate to={user ? "/trips" : "/login"} replace />} />

        <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
        <Route path="/new-trip" element={<ProtectedRoute><NewTrip /></ProtectedRoute>} />
        <Route path="/onboarding" element={<Navigate to="/new-trip" replace />} />
        <Route path="/join/:inviteCode" element={<JoinTrip />} />
        <Route path="/profiel" element={<ProtectedRoute><Profiel /></ProtectedRoute>} />

        <Route path="/trip/:tripId" element={<ProtectedRoute><TripRouteGuard><TripHome /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/trip/:tripId/reis" element={<ProtectedRoute><TripRouteGuard><TripReis /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/trip/:tripId/samen" element={<ProtectedRoute><TripRouteGuard><TripSamen /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/trip/:tripId/settings" element={<ProtectedRoute><TripRouteGuard><TripSettings /></TripRouteGuard></ProtectedRoute>} />

        <Route path="/legacy/:tripId/taken" element={<ProtectedRoute><TripRouteGuard><Taken /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/legacy/:tripId/reisplanner" element={<ProtectedRoute><TripRouteGuard><Reisplanner /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/legacy/:tripId/info" element={<ProtectedRoute><TripRouteGuard><Info /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/legacy/:tripId/uitslag" element={<ProtectedRoute><TripRouteGuard><Uitslag /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/legacy/:tripId/intake" element={<ProtectedRoute><TripRouteGuard><Intake /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/legacy/:tripId/accommodations" element={<ProtectedRoute><TripRouteGuard><Accommodations /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/legacy/:tripId/accommodations/:id" element={<ProtectedRoute><TripRouteGuard><AccommodationDetail /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/legacy/:tripId/taken/:section" element={<ProtectedRoute><TripRouteGuard><TaskContext /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/legacy/:tripId/kosten" element={<ProtectedRoute><TripRouteGuard><Kosten /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/legacy/:tripId/wensen" element={<ProtectedRoute><TripRouteGuard><Wensen /></TripRouteGuard></ProtectedRoute>} />
        <Route path="/legacy/:tripId/admin" element={<ProtectedRoute><TripRouteGuard><Admin /></TripRouteGuard></ProtectedRoute>} />

        {[
          "/taken",
          "/reisplanner",
          "/info",
          "/uitslag",
          "/intake",
          "/accommodations",
          "/kosten",
          "/wensen",
          "/admin",
        ].map((path) => (
          <Route key={path} path={path} element={<Navigate to="/trips" replace />} />
        ))}

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
