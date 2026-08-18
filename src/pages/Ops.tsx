import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  FileText,
  Gauge,
  ListTodo,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
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

type Section = "overview" | "users" | "trips" | "audit";

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return "Onbekend";
  return new Date(value).toLocaleString("nl-NL", includeTime
    ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" });
}

function MetricCell({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-extrabold tracking-tight">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

function SectionButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 pb-3 pt-1 text-sm font-bold transition-colors ${active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </button>
  );
}

function statusLabel(value: string) {
  if (value === "active") return "Actief";
  if (value === "completed") return "Afgerond";
  if (value === "archived") return "Gearchiveerd";
  return "Planning";
}

export default function Ops() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [section, setSection] = useState<Section>("overview");
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

  const clientErrors = summary.data?.client_errors_24h ?? 0;
  const hansieRequests = summary.data?.hansie_requests_24h ?? 0;
  const healthy = !summary.isError && clientErrors === 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/profiel")} aria-label="Terug naar account">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold">Vakansie Beheer</p>
            <p className="truncate text-[11px] text-muted-foreground">Platformconsole · {profile?.display_name || "beheerder"}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate("/ops/errors")}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Fouten</span>
            {clientErrors > 0 && <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">{clientErrors}</span>}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <section className="flex flex-col gap-5 border-b border-border/70 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Platformconsole</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Overzicht en operatie</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Gebruikers, reizen, systeemgezondheid en beheeracties op één plek.
            </p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${healthy ? "border-primary/20 bg-primary/10 text-primary" : "border-destructive/20 bg-destructive/5 text-destructive"}`}>
            {healthy ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {summary.isError ? "Status onbekend" : clientErrors > 0 ? `${clientErrors} browserfouten in 24u` : "Geen browserfouten in 24u"}
          </div>
        </section>

        <nav className="mt-6 flex gap-6 overflow-x-auto border-b border-border/70" aria-label="Beheeronderdelen">
          <SectionButton active={section === "overview"} label="Overzicht" onClick={() => switchSection("overview")} />
          <SectionButton active={section === "users"} label="Gebruikers" onClick={() => switchSection("users")} />
          <SectionButton active={section === "trips"} label="Reizen" onClick={() => switchSection("trips")} />
          <SectionButton active={section === "audit"} label="Logboek" onClick={() => switchSection("audit")} />
        </nav>

        {section === "overview" && (
          <div className="mt-8 space-y-9">
            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-extrabold">Kerncijfers</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Huidige omvang en open werkvoorraad.</p>
                </div>
              </div>
              <div className="grid divide-x divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
                <MetricCell label="Gebruikers" value={summary.data?.users ?? "…"} detail={`${summary.data?.trips ?? "…"} reizen totaal`} />
                <MetricCell label="Actieve reizen" value={summary.data?.active_trips ?? "…"} detail={`${summary.data?.archived_trips ?? "…"} gearchiveerd`} />
                <MetricCell label="Open taken" value={summary.data?.open_tasks ?? "…"} detail={`${summary.data?.active_invites ?? "…"} actieve uitnodigingen`} />
                <MetricCell label="Reisinhoud" value={(summary.data?.trip_items ?? 0) + (summary.data?.ready_documents ?? 0)} detail={`${summary.data?.trip_items ?? "…"} onderdelen · ${summary.data?.ready_documents ?? "…"} documenten`} />
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
              <div>
                <div className="mb-3">
                  <h2 className="font-display text-lg font-extrabold">Systeemgezondheid</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Operationele signalen uit de laatste 24 uur.</p>
                </div>
                <div className="divide-y divide-border/70 border-y border-border/70">
                  <button type="button" onClick={() => navigate("/ops/errors")} className="group flex w-full items-center gap-4 py-4 text-left">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${clientErrors > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      <Activity className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">Browserfouten</p>
                      <p className="mt-1 text-xs text-muted-foreground">{clientErrors} geregistreerd in de afgelopen 24 uur</p>
                    </div>
                    <span className="font-display text-2xl font-extrabold">{clientErrors}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <div className="flex items-center gap-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">Hansie-gebruik</p>
                      <p className="mt-1 text-xs text-muted-foreground">Succesvolle requests in de afgelopen 24 uur</p>
                    </div>
                    <span className="font-display text-2xl font-extrabold">{hansieRequests}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3">
                  <h2 className="font-display text-lg font-extrabold">Werkruimte</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Ga direct naar het operationele onderdeel.</p>
                </div>
                <div className="divide-y divide-border/70 border-y border-border/70">
                  {[
                    { key: "users" as const, icon: Users, label: "Gebruikers", detail: "Accounts, rollen en memberships" },
                    { key: "trips" as const, icon: Plane, label: "Reizen", detail: "Status, deelnemers en inhoud" },
                    { key: "audit" as const, icon: ListTodo, label: "Logboek", detail: "Recente beheerhandelingen" },
                  ].map((item) => (
                    <button key={item.key} type="button" onClick={() => switchSection(item.key)} className="group flex w-full items-center gap-3 py-4 text-left">
                      <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{item.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {section !== "overview" && section !== "audit" && (
          <form onSubmit={submitSearch} className="mt-7 flex max-w-2xl gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder={section === "users" ? "Zoek gebruiker op naam of e-mail" : "Zoek reis of bestemming"}
                className="h-11 rounded-xl pl-9"
              />
            </div>
            <Button type="submit" variant="outline" className="h-11 rounded-xl">Zoeken</Button>
          </form>
        )}

        {section === "users" && (
          <section className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)]">
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Accounts</p>
                <span className="text-xs text-muted-foreground">{users.data?.length ?? 0}</span>
              </div>
              <div className="divide-y divide-border/70 border-y border-border/70">
                {users.isLoading ? (
                  <p className="py-5 text-sm text-muted-foreground">Gebruikers laden…</p>
                ) : users.isError ? (
                  <p className="py-5 text-sm text-destructive">Gebruikers konden niet worden geladen.</p>
                ) : users.data?.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedUserId(account.id)}
                    className={`flex w-full items-center gap-3 px-1 py-4 text-left transition-colors sm:px-3 ${selectedUserId === account.id ? "bg-secondary/55" : "hover:bg-secondary/30"}`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{account.display_name || account.email || "Gebruiker"}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{account.email || "Geen e-mail"}</p>
                    </div>
                    {account.roles.includes("admin") && <span className="hidden rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary sm:inline">Admin</span>}
                    <span className="shrink-0 text-xs text-muted-foreground">{account.trip_count} reizen</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              {!selectedUserId ? (
                <div className="border-y border-border/70 py-6 text-sm leading-relaxed text-muted-foreground">Selecteer een gebruiker voor accountdetails en memberships.</div>
              ) : userDetail.isLoading ? (
                <p className="border-y border-border/70 py-6 text-sm text-muted-foreground">Details laden…</p>
              ) : userDetail.data ? (
                <div className="border-y border-border/70 py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><User className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-xl font-extrabold">{userDetail.data.display_name || userDetail.data.email}</h2>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{userDetail.data.email}</p>
                    </div>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border/70 pt-4 text-sm">
                    <div><dt className="text-xs text-muted-foreground">Account sinds</dt><dd className="mt-1 font-semibold">{formatDate(userDetail.data.created_at)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Laatste login</dt><dd className="mt-1 font-semibold">{formatDate(userDetail.data.last_sign_in_at)}</dd></div>
                  </dl>
                  <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Reizen</h3>
                  <div className="mt-2 divide-y divide-border/70 border-y border-border/70">
                    {userDetail.data.memberships.length === 0 ? (
                      <p className="py-4 text-sm text-muted-foreground">Geen reizen.</p>
                    ) : userDetail.data.memberships.map((membership) => (
                      <button
                        key={membership.trip_id}
                        type="button"
                        onClick={() => {
                          switchSection("trips");
                          setSelectedTripId(membership.trip_id);
                        }}
                        className="flex w-full items-center gap-3 py-3 text-left"
                      >
                        <Plane className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{membership.trip_name}</span>
                        <span className="text-xs text-muted-foreground">{membership.role === "organizer" ? "Organisator" : "Lid"}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </section>
        )}

        {section === "trips" && (
          <section className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(380px,.95fr)]">
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Reizen</p>
                <span className="text-xs text-muted-foreground">{trips.data?.length ?? 0}</span>
              </div>
              <div className="divide-y divide-border/70 border-y border-border/70">
                {trips.isLoading ? (
                  <p className="py-5 text-sm text-muted-foreground">Reizen laden…</p>
                ) : trips.isError ? (
                  <p className="py-5 text-sm text-destructive">Reizen konden niet worden geladen.</p>
                ) : trips.data?.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => {
                      setSelectedTripId(trip.id);
                      setStatusValue(trip.status);
                    }}
                    className={`flex w-full items-center gap-3 px-1 py-4 text-left transition-colors sm:px-3 ${selectedTripId === trip.id ? "bg-secondary/55" : "hover:bg-secondary/30"}`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${trip.status === "archived" ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                      {trip.status === "archived" ? <Archive className="h-4 w-4" /> : <Plane className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{trip.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{trip.destination_name || "Geen bestemming"} · {trip.member_count} deelnemers</p>
                    </div>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{statusLabel(trip.status)}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              {!selectedTripId ? (
                <div className="border-y border-border/70 py-6 text-sm leading-relaxed text-muted-foreground">Selecteer een reis voor status, deelnemers en operationele details.</div>
              ) : tripDetail.isLoading ? (
                <p className="border-y border-border/70 py-6 text-sm text-muted-foreground">Details laden…</p>
              ) : tripDetail.data ? (
                <div className="border-y border-border/70 py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Plane className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-xl font-extrabold">{tripDetail.data.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{tripDetail.data.destination_name || "Geen bestemming"} · {formatDate(tripDetail.data.start_date)} – {formatDate(tripDetail.data.end_date)}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-4 divide-x divide-border/70 border-y border-border/70 py-3 text-center">
                    <div><Users className="mx-auto h-4 w-4 text-muted-foreground" /><p className="mt-1 font-bold">{tripDetail.data.member_count}</p><p className="text-[10px] text-muted-foreground">mensen</p></div>
                    <div><Plane className="mx-auto h-4 w-4 text-muted-foreground" /><p className="mt-1 font-bold">{tripDetail.data.item_count}</p><p className="text-[10px] text-muted-foreground">onderdelen</p></div>
                    <div><ListTodo className="mx-auto h-4 w-4 text-muted-foreground" /><p className="mt-1 font-bold">{tripDetail.data.open_task_count}</p><p className="text-[10px] text-muted-foreground">taken</p></div>
                    <div><FileText className="mx-auto h-4 w-4 text-muted-foreground" /><p className="mt-1 font-bold">{tripDetail.data.document_count}</p><p className="text-[10px] text-muted-foreground">docs</p></div>
                  </div>

                  <div className="mt-5">
                    <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Reisstatus</label>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={statusValue || tripDetail.data.status}
                        onChange={(event) => setStatusValue(event.target.value)}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
                      >
                        <option value="planning">Planning</option>
                        <option value="active">Actief</option>
                        <option value="completed">Afgerond</option>
                        <option value="archived">Gearchiveerd</option>
                      </select>
                      <Button
                        size="sm"
                        className="h-10 rounded-xl"
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

                  <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Deelnemers</h3>
                  <div className="mt-2 divide-y divide-border/70 border-y border-border/70">
                    {tripDetail.data.members.map((member) => (
                      <div key={member.user_id} className="flex items-center gap-3 py-3 text-sm">
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{member.display_name || member.email || "Gebruiker"}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{member.email}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{member.role === "organizer" ? "Organisator" : "Lid"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </section>
        )}

        {section === "audit" && (
          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold">Logboek</h2>
                <p className="mt-1 text-xs text-muted-foreground">De 30 meest recente beheerhandelingen.</p>
              </div>
              <Gauge className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="divide-y divide-border/70 border-y border-border/70">
              {audit.isLoading ? (
                <p className="py-5 text-sm text-muted-foreground">Logboek laden…</p>
              ) : audit.isError ? (
                <p className="py-5 text-sm text-destructive">Logboek kon niet worden geladen.</p>
              ) : audit.data?.length === 0 ? (
                <p className="py-5 text-sm text-muted-foreground">Nog geen beheerhandelingen.</p>
              ) : audit.data?.map((entry) => (
                <div key={entry.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{entry.action.replaceAll("_", " ")}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {entry.target_type}{entry.target_id ? ` · ${entry.target_id}` : ""}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right">
                    <p>{formatDate(entry.created_at, true)}</p>
                    <p className="mt-1 truncate">actor {entry.actor_user_id.slice(0, 8)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
