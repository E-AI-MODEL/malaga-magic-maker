import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, FileText, ListTodo, Plane, Search, Settings, User, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

type Section = "users" | "trips" | "audit";

function formatDate(value: string | null | undefined) {
  if (!value) return "Onbekend";
  return new Date(value).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}

export default function Ops() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [section, setSection] = useState<Section>("users");
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

  const switchSection = (next: Section) => {
    setSection(next);
    setSelectedTripId(null);
    setSelectedUserId(null);
    setDraftSearch("");
    setSearch("");
    setActionError("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profiel")} aria-label="Terug">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold">Beheer</p>
            <p className="truncate text-xs text-muted-foreground">Interne Vakansie-omgeving · {profile?.display_name || "beheerder"}</p>
          </div>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Systeem</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">Overzicht</h1>
          {summary.isError && <p className="mt-3 text-sm text-destructive">De beheergegevens konden niet worden geladen.</p>}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Gebruikers" value={summary.data?.users ?? "…"} />
            <Stat label="Reizen" value={summary.data?.trips ?? "…"} />
            <Stat label="Actieve reizen" value={summary.data?.active_trips ?? "…"} />
            <Stat label="Open taken" value={summary.data?.open_tasks ?? "…"} />
            <Stat label="Reisonderdelen" value={summary.data?.trip_items ?? "…"} />
            <Stat label="Documenten" value={summary.data?.ready_documents ?? "…"} />
            <Stat label="Actieve uitnodigingen" value={summary.data?.active_invites ?? "…"} />
            <Stat label="Gearchiveerd" value={summary.data?.archived_trips ?? "…"} />
          </div>
        </section>

        <section className="mt-8">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {([
              ["users", "Gebruikers", User],
              ["trips", "Reizen", Plane],
              ["audit", "Logboek", ListTodo],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => switchSection(key)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${section === key ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}
              >
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>

          {section !== "audit" && (
            <form onSubmit={submitSearch} className="mt-4 flex max-w-xl gap-2">
              <Input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder={section === "users" ? "Zoek op naam of e-mail" : "Zoek op reis of bestemming"} />
              <Button type="submit" variant="outline"><Search className="mr-2 h-4 w-4" />Zoeken</Button>
            </form>
          )}

          {section === "users" && (
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <div className="space-y-2">
                {users.isLoading ? <p className="text-sm text-muted-foreground">Gebruikers laden…</p> : users.data?.map((user) => (
                  <button key={user.id} onClick={() => setSelectedUserId(user.id)} className={`w-full rounded-2xl border p-4 text-left ${selectedUserId === user.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{user.display_name || user.email || "Gebruiker"}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold">{user.trip_count} reizen</span>
                    </div>
                  </button>
                ))}
              </div>
              <div>
                {!selectedUserId ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Kies een gebruiker om memberships en accountstatus te bekijken.</div>
                ) : userDetail.isLoading ? (
                  <p className="text-sm text-muted-foreground">Details laden…</p>
                ) : userDetail.data ? (
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <h2 className="font-display text-xl font-extrabold">{userDetail.data.display_name || userDetail.data.email}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{userDetail.data.email}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Account sinds</p><p className="mt-1 font-medium">{formatDate(userDetail.data.created_at)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Laatste login</p><p className="mt-1 font-medium">{formatDate(userDetail.data.last_sign_in_at)}</p></div>
                    </div>
                    <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Reizen</h3>
                    <div className="mt-2 space-y-2">
                      {userDetail.data.memberships.length === 0 ? <p className="text-sm text-muted-foreground">Geen reizen.</p> : userDetail.data.memberships.map((membership) => (
                        <button key={membership.trip_id} onClick={() => { switchSection("trips"); setSelectedTripId(membership.trip_id); }} className="flex w-full items-center justify-between rounded-xl bg-secondary/55 px-3 py-3 text-left text-sm">
                          <span className="min-w-0 truncate font-medium">{membership.trip_name}</span>
                          <span className="ml-3 shrink-0 text-xs text-muted-foreground">{membership.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {section === "trips" && (
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <div className="space-y-2">
                {trips.isLoading ? <p className="text-sm text-muted-foreground">Reizen laden…</p> : trips.data?.map((trip) => (
                  <button key={trip.id} onClick={() => { setSelectedTripId(trip.id); setStatusValue(trip.status); }} className={`w-full rounded-2xl border p-4 text-left ${selectedTripId === trip.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <p className="font-semibold">{trip.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{trip.destination_name || "Geen bestemming"} · {trip.member_count} deelnemers · {trip.status}</p>
                  </button>
                ))}
              </div>
              <div>
                {!selectedTripId ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Kies een reis voor details en beheermogelijkheden.</div>
                ) : tripDetail.isLoading ? (
                  <p className="text-sm text-muted-foreground">Details laden…</p>
                ) : tripDetail.data ? (
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <h2 className="font-display text-xl font-extrabold">{tripDetail.data.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{tripDetail.data.destination_name || "Geen bestemming"} · {formatDate(tripDetail.data.start_date)} – {formatDate(tripDetail.data.end_date)}</p>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div><Users className="h-4 w-4 text-primary" /><p className="mt-1 font-bold">{tripDetail.data.member_count}</p><p className="text-[11px] text-muted-foreground">deelnemers</p></div>
                      <div><Plane className="h-4 w-4 text-primary" /><p className="mt-1 font-bold">{tripDetail.data.item_count}</p><p className="text-[11px] text-muted-foreground">onderdelen</p></div>
                      <div><ListTodo className="h-4 w-4 text-primary" /><p className="mt-1 font-bold">{tripDetail.data.open_task_count}</p><p className="text-[11px] text-muted-foreground">open taken</p></div>
                      <div><FileText className="h-4 w-4 text-primary" /><p className="mt-1 font-bold">{tripDetail.data.document_count}</p><p className="text-[11px] text-muted-foreground">documenten</p></div>
                    </div>
                    <div className="mt-6 border-t border-border pt-5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reisstatus</label>
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
                    <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Deelnemers</h3>
                    <div className="mt-2 space-y-2">
                      {tripDetail.data.members.map((member) => (
                        <div key={member.user_id} className="flex items-center justify-between rounded-xl bg-secondary/55 px-3 py-2.5 text-sm">
                          <div className="min-w-0"><p className="truncate font-medium">{member.display_name || member.email || "Gebruiker"}</p><p className="truncate text-[11px] text-muted-foreground">{member.email}</p></div>
                          <span className="ml-3 shrink-0 text-xs text-muted-foreground">{member.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {section === "audit" && (
            <div className="mt-5">
              {audit.isLoading ? <p className="text-sm text-muted-foreground">Logboek laden…</p> : audit.isError ? <p className="text-sm text-destructive">Het logboek kon niet worden geladen.</p> : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {audit.data?.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Nog geen beheeracties.</p> : audit.data?.map((event, index) => (
                    <div key={event.id} className={`px-4 py-3 text-sm ${index > 0 ? "border-t border-border" : ""}`}>
                      <div className="flex items-center justify-between gap-3"><p className="font-medium">{event.action}</p><span className="text-[11px] text-muted-foreground">{formatDate(event.created_at)}</span></div>
                      <p className="mt-1 text-xs text-muted-foreground">{event.target_type}{event.target_id ? ` · ${event.target_id}` : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
