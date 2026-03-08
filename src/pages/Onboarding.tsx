import { useState } from "react";
import { useTrip } from "@/contexts/TripContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plane, Users, ArrowRight, Ticket } from "lucide-react";

type Step = "choose" | "create" | "join";

export default function Onboarding() {
  const { createTrip, joinTrip } = useTrip();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create trip fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupSize, setGroupSize] = useState("6");

  // Join trip fields
  const [inviteCode, setInviteCode] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      setError("Vul alle verplichte velden in");
      return;
    }
    setLoading(true);
    setError("");
    const trip = await createTrip({
      name: name.trim(),
      description: description.trim() || undefined,
      start_date: startDate,
      end_date: endDate,
      group_size: parseInt(groupSize) || 6,
    });
    if (trip) {
      navigate("/taken");
    } else {
      setError("Er ging iets mis bij het aanmaken");
    }
    setLoading(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError("Voer een uitnodigingscode in");
      return;
    }
    setLoading(true);
    setError("");
    const result = await joinTrip(inviteCode.trim());
    if (result.error) {
      setError(result.error);
    } else {
      navigate("/taken");
    }
    setLoading(false);
  };

  if (step === "choose") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Welkom bij <span className="text-primary">Vakansie</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Plan je vakansie met Hansie, wel zo makkelijk.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => setStep("create")}
            className="w-full flex items-center gap-4 rounded-2xl border-2 border-border p-5 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Plane className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">Vakantie aanmaken</p>
              <p className="text-xs text-muted-foreground">Start een nieuwe trip en nodig je groep uit</p>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground/40" />
          </button>

          <button
            onClick={() => setStep("join")}
            className="w-full flex items-center gap-4 rounded-2xl border-2 border-border p-5 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Ticket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">Uitnodiging accepteren</p>
              <p className="text-xs text-muted-foreground">Voer je code in om mee te doen</p>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground/40" />
          </button>
        </div>
      </div>
    );
  }

  if (step === "create") {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="max-w-sm mx-auto">
          <button onClick={() => { setStep("choose"); setError(""); }} className="text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
            ← Terug
          </button>
          <h2 className="font-display text-2xl font-extrabold mb-1">Nieuwe vakantie</h2>
          <p className="text-sm text-muted-foreground mb-6">Vul de basisgegevens in</p>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Naam *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="bijv. Malaga 2026" className="mt-1 h-12" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Beschrijving</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Korte omschrijving..." className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Van *</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 h-12" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tot *</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 h-12" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groepsgrootte</label>
              <Input type="number" value={groupSize} onChange={(e) => setGroupSize(e.target.value)} min={2} max={30} className="mt-1 h-12" />
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
              {loading ? "Aanmaken..." : "Vakantie aanmaken"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // step === "join"
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-sm mx-auto">
        <button onClick={() => { setStep("choose"); setError(""); }} className="text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          ← Terug
        </button>
        <h2 className="font-display text-2xl font-extrabold mb-1">Meedoen</h2>
        <p className="text-sm text-muted-foreground mb-6">Voer de uitnodigingscode in die je hebt ontvangen</p>

        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="bijv. a1b2c3d4e5f6"
            className="h-12 text-center font-mono text-lg tracking-widest"
          />
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
            {loading ? "Deelnemen..." : "Deelnemen aan vakantie"}
          </Button>
        </form>
      </div>
    </div>
  );
}
