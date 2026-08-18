import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  getOpsSummary,
  getOpsTripOverview,
  getOpsUserOverview,
  listOpsAudit,
  searchOpsTrips,
  searchOpsUsers,
  setOpsTripStatus,
} from "@/features/ops/data";
import { OpsShell, opsSectionPath, type OpsSection } from "@/features/ops/OpsShell";

type Section = Exclude<OpsSection, "errors">;

const sectionIds: Section[] = ["overview", "users", "trips", "audit"];

function parseSection(value: string | null): Section {
  return sectionIds.includes((value || "") as Section) ? (value as Section) : "overview";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Onbekend";
  return new Date(value).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function MetricRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular">{value}</span>
    </div>
  );
}

export default function Ops() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const section = parseSection(searchParams.get("section"));
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState("");
  const [actionError, setActionError] = useState("");

  const summary = useQuery({ queryKey: ["ops-summary"], queryFn: getOpsSummary });
  const users = useQuery({ queryKey: ["ops-users", search], queryFn: () => searchOpsUsers(search), enabled: section === "users" });
  const trips = useQuery({ queryKey: ["ops-trips", search], queryFn: () => searchOpsTrips(search), enabled: section === "trips" });
  const audit = useQuery({ queryKey: ["ops-audit"], queryFn: listOpsAudit, enabled: section === "audit" });
  const userDetail = useQuery({ queryKey: ["ops-user", selectedUserId], queryFn: () => getOpsUserOverview(selectedUserId || ""), enabled: Boolean(selectedUserId) });
  const tripDetail = useQuery({ queryKey: ["ops-trip", selectedTripId], queryFn: () => getOpsTripOverview(selectedTripId || ""), enabled: Boolean(selectedTripId) });

  const statusMutation = useMutation({
    mutationFn: ({ tripId, status }: { tripId: string; status: string }) => setOpsTripStatus(tripId, status),
    onSuccess: async () => {
      setActionError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ops-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["ops-trips"] }),
        queryClient.invalidateQueries({ queryKey: ["ops-trip", selectedTripId] }),
        queryClient.invalidateQueries({ queryKey: ["ops-audit"] }),
      ]);
    },
    onError: (error) => {
      console.error("ops status change failed", error);
      setActionError("De reisstatus kon niet worden aangepast.");
    },
  });

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(draftSearch.trim());
  };

  const switchSection = (next: OpsSection) => {
    if (next === "errors") {
      navigate(opsSectionPath("errors"));
      return;
    }
    setSearchParams({ section: next }, { replace: false });
    setSelectedTripId(null);
    setSelectedUserId(null);
    setDraftSearch("");
    setSearch("");
    setActionError("");
  };

  return (
    <OpsShell active={section} onSelect={switchSection} operator={profile?.display_name}>
      {summary.isError && <p className="text-sm text-destructive">De beheergegevens konden niet worden geladen.</p>}

      {section === "overview" && (
        <div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-rule/10 pb-3 text-xs text-muted-foreground">
            <span>Status: {summary.isLoading ? "laden" : summary.isError ? "storing" : "operationeel"}</span>
            <span>Reizen actief: {summary.data?.active_trips ?? "…"}</span>
            <span>Browserfouten 24 uur: {summary.data?.client_errors_24h ?? "…"}</span>
          </div>

          <div className="mt-5 grid gap-x-10 sm:grid-cols-2">
            <div className="rule-divide">
              <MetricRow label="Gebruikers" value={summary.data?.users ?? "…"} />
              <MetricRow label="Reizen" value={summary.data?.trips ?? "…"} />
              <MetricRow label="Actieve reizen" value={summary.data?.active_trips ?? "…"} />
              <MetricRow label="Gearchiveerd" value={summary.data?.archived_trips ?? "…"} />
            </div>
            <div className="rule-divide">
              <MetricRow label="Reisonderdelen" value={summary.data?.trip_items ?? "…"} />
              <MetricRow label="Open taken" value={summary.data?.open_tasks ?? "…"} />
              <MetricRow label="Documenten" value={summary.data?.ready_documents ?? "…"} />
              <MetricRow label="Actieve uitnodigingen" value={summary.data?.active_invites ?? "…"} />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[13px] font-semibold text-foreground/70">Signalen</p>
            <div className="rule-divide">
              <MetricRow label="Hansie-verzoeken · 24 uur" value={summary.data?.hansie_requests_24h ?? "…"} />
              <MetricRow label="Browserfouten · 24 uur" value={summary.data?.client_errors_24h ?? "…"} />
            </div>
            <button onClick={() => navigate("/ops/errors")} className="mt-2 text-xs font-semibold text-primary hover:underline">
              Open Fouten
            </button>
          </div>
        </div>
      )}

      {section !== "overview" && section !== "audit" && (
        <form onSubmit={submitSearch} className="flex max-w-xl gap-2">
          <Input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder={section === "users" ? "Zoek op naam of e-mail" : "Zoek op reis of bestemming"} />
          <Button type="submit" variant="outline"><Search className="mr-2 h-4 w-4" />Zoeken</Button>
        </form>
      )}

      {section === "users" && (
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rule-divide">
            {users.isLoading ? <p className="py-3 text-sm text-muted-foreground">Gebruikers laden…</p> : users.data?.map((user) => (
              <button key={user.id} onClick={() => setSelectedUserId(user.id)} className={`flex w-full items-center gap-3 py-2.5 text-left ${selectedUserId === user.id ? "text-primary" : ""}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{user.display_name || user.email || "Gebruiker"}</span>
                  <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                </span>
                <span className="shrink-0 text-xs tabular text-muted-foreground">{user.trip_count} reizen</span>
              </button>
            ))}
          </div>
          <div>
            {!selectedUserId ? (
              <p className="text-sm text-muted-foreground">Kies een gebruiker om memberships en accountstatus te bekijken.</p>
            ) : userDetail.isLoading ? (
              <p className="text-sm text-muted-foreground">Details laden…</p>
            ) : userDetail.data ? (
              <div>
                <p className="text-sm font-semibold">{userDetail.data.display_name || userDetail.data.email}</p>
                <p className="text-xs text-muted-foreground">{userDetail.data.email}</p>
                <div className="mt-3 rule-divide">
                  <MetricRow label="Account sinds" value={formatDate(userDetail.data.created_at)} />
                  <MetricRow label="Laatste login" value={formatDate(userDetail.data.last_sign_in_at)} />
                </div>
                <p className="mt-5 text-[13px] font-semibold text-foreground/70">Reizen</p>
                <div className="rule-divide">
                  {userDetail.data.memberships.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Geen reizen.</p> : userDetail.data.memberships.map((membership) => (
                    <button key={membership.trip_id} onClick={() => { switchSection("trips"); setSelectedTripId(membership.trip_id); }} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm">
                      <span className="min-w-0 truncate font-medium">{membership.trip_name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{membership.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {section === "trips" && (
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rule-divide">
            {trips.isLoading ? <p className="py-3 text-sm text-muted-foreground">Reizen laden…</p> : trips.data?.map((trip) => (
              <button key={trip.id} onClick={() => { setSelectedTripId(trip.id); setStatusValue(trip.status); }} className={`block w-full py-2.5 text-left ${selectedTripId === trip.id ? "text-primary" : ""}`}>
                <span className="block truncate text-sm font-medium">{trip.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{trip.destination_name || "Geen bestemming"} · {trip.member_count} deelnemers · {trip.status}</span>
              </button>
            ))}
          </div>
          <div>
            {!selectedTripId ? (
              <p className="text-sm text-muted-foreground">Kies een reis voor details en beheermogelijkheden.</p>
            ) : tripDetail.isLoading ? (
              <p className="text-sm text-muted-foreground">Details laden…</p>
            ) : tripDetail.data ? (
              <div>
                <p className="text-sm font-semibold">{tripDetail.data.name}</p>
                <p className="text-xs text-muted-foreground">{tripDetail.data.destination_name || "Geen bestemming"} · {formatDate(tripDetail.data.start_date)} – {formatDate(tripDetail.data.end_date)}</p>
                <div className="mt-3 rule-divide">
                  <MetricRow label="Deelnemers" value={tripDetail.data.member_count} />
                  <MetricRow label="Onderdelen" value={tripDetail.data.item_count} />
                  <MetricRow label="Open taken" value={tripDetail.data.open_task_count} />
                  <MetricRow label="Open keuzes" value={tripDetail.data.open_decision_count} />
                  <MetricRow label="Documenten" value={tripDetail.data.document_count} />
                  <MetricRow label="Actieve uitnodigingen" value={tripDetail.data.active_invite_count} />
                </div>

                <div className="mt-5">
                  <label className="text-xs font-semibold text-muted-foreground">Reisstatus</label>
                  <div className="mt-2 flex gap-2">
                    <select value={statusValue || tripDetail.data.status} onChange={(event) => setStatusValue(event.target.value)} className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="planning">Planning</option>
                      <option value="active">Actief</option>
                      <option value="completed">Afgerond</option>
                      <option value="archived">Gearchiveerd</option>
                    </select>
                    <Button
                      disabled={statusMutation.isPending || (statusValue || tripDetail.data.status) === tripDetail.data.status}
                      onClick={() => {
                        const nextStatus = statusValue || tripDetail.data.status;
                        if (nextStatus === "archived" && !window.confirm("Deze reis archiveren?")) return;
                        statusMutation.mutate({ tripId: tripDetail.data.id, status: nextStatus });
                      }}
                    >Opslaan</Button>
                  </div>
                  {actionError && <p className="mt-2 text-sm text-destructive">{actionError}</p>}
                </div>

                <p className="mt-5 text-[13px] font-semibold text-foreground/70">Deelnemers</p>
                <div className="rule-divide">
                  {tripDetail.data.members.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{member.display_name || member.email || "Gebruiker"}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{member.email}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{member.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {section === "audit" && (
        <div>
          {audit.isLoading ? <p className="text-sm text-muted-foreground">Logboek laden…</p> : audit.isError ? <p className="text-sm text-destructive">Het logboek kon niet worden geladen.</p> : (
            <div className="rule-divide">
              {audit.data?.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nog geen beheeracties.</p> : audit.data?.map((event) => (
                <div key={event.id} className="py-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-medium">{event.action}</p>
                    <span className="shrink-0 text-[11px] tabular text-muted-foreground">{formatDate(event.created_at)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.target_type}{event.target_id ? ` · ${event.target_id}` : ""}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </OpsShell>
  );
}