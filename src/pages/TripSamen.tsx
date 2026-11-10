import { Navigate, useParams, useSearchParams } from "react-router-dom";

/** Samen merged into Reis: old links land on Te doen, or Knaakie for costs. */
export default function TripSamen() {
  const { tripId = "" } = useParams();
  const [params] = useSearchParams();
  if (params.get("section") === "expenses") return <Navigate to={`/knaakie?tripId=${tripId}`} replace />;
  return <Navigate to={`/trip/${tripId}/reis?tab=todo`} replace />;
}
