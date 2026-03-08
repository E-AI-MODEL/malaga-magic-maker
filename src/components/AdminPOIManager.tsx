import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTrip } from "@/contexts/TripContext";
import { usePOIData, type POICategory, type POI } from "@/hooks/usePOIData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, Save, ExternalLink, MapPin } from "lucide-react";
import { toast } from "sonner";

export function AdminPOIManager() {
  const { activeTrip } = useTrip();
  const { categories, loading, refetch } = usePOIData();
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📍");
  const [newCatKey, setNewCatKey] = useState("");

  const handleAddCategory = async () => {
    if (!newCatLabel || !newCatKey) return;
    const { error } = await supabase.from("poi_categories").insert({
      trip_id: activeTrip?.id || null,
      key: newCatKey,
      label: newCatLabel,
      emoji: newCatEmoji,
      sort_order: categories.length,
    } as any);
    if (error) { toast.error("Fout bij toevoegen"); return; }
    setNewCatLabel(""); setNewCatKey(""); setNewCatEmoji("📍");
    toast.success("Categorie toegevoegd");
    refetch();
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Categorie en alle POIs verwijderen?")) return;
    await supabase.from("poi_categories").delete().eq("id", catId);
    toast.success("Verwijderd");
    refetch();
  };

  const handleUpdateCategory = async (cat: POICategory, updates: Partial<POICategory>) => {
    await supabase.from("poi_categories").update(updates as any).eq("id", cat.id);
    toast.success("Bijgewerkt");
    refetch();
  };

  if (loading) return <p className="text-xs text-muted-foreground">Laden...</p>;

  return (
    <div className="space-y-4">
      {/* Existing categories */}
      {categories.map((cat) => (
        <CategoryEditor key={cat.id} category={cat} onRefetch={refetch} onDelete={() => handleDeleteCategory(cat.id)} onUpdate={(u) => handleUpdateCategory(cat, u)} />
      ))}

      {/* Add new category */}
      <div className="border border-dashed rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nieuwe categorie</p>
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Key (bijv. golf)" value={newCatKey} onChange={(e) => setNewCatKey(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Label (bijv. Golfbanen)" value={newCatLabel} onChange={(e) => setNewCatLabel(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Emoji" value={newCatEmoji} onChange={(e) => setNewCatEmoji(e.target.value)} className="h-8 text-xs w-16" />
        </div>
        <Button size="sm" onClick={handleAddCategory} disabled={!newCatLabel || !newCatKey}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Categorie toevoegen
        </Button>
      </div>
    </div>
  );
}

function CategoryEditor({ category, onRefetch, onDelete, onUpdate }: {
  category: POICategory;
  onRefetch: () => void;
  onDelete: () => void;
  onUpdate: (u: Partial<POICategory>) => void;
}) {
  const [showAddPOI, setShowAddPOI] = useState(false);
  const [thresholdGood, setThresholdGood] = useState(String(category.color_threshold_good));
  const [thresholdOk, setThresholdOk] = useState(String(category.color_threshold_ok));

  // Collect all location labels from existing POIs
  const allLocations = [...new Set(category.pois.flatMap((p) => Object.keys(p.travel_times)))].sort();

  return (
    <Collapsible>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-2">
            <span>{category.emoji}</span>
            <span className="text-sm font-semibold">{category.label}</span>
            <Badge variant="outline" className="text-[10px]">{category.pois.length} POIs</Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 rounded-b-lg p-4 space-y-4 bg-secondary/20">
          {/* Category settings */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground mb-1">Kleurdrempels (min)</p>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-emerald-100" />
                  <Input value={thresholdGood} onChange={(e) => setThresholdGood(e.target.value)} className="h-7 w-16 text-xs" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-amber-100" />
                  <Input value={thresholdOk} onChange={(e) => setThresholdOk(e.target.value)} className="h-7 w-16 text-xs" />
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => onUpdate({ color_threshold_good: Number(thresholdGood), color_threshold_ok: Number(thresholdOk) })}>
                  <Save className="h-3 w-3 mr-1" /> Opslaan
                </Button>
              </div>
            </div>
            <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={onDelete}>
              <Trash2 className="h-3 w-3 mr-1" /> Verwijder
            </Button>
          </div>

          {/* Location labels */}
          {allLocations.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Locaties in matrix</p>
              <div className="flex flex-wrap gap-1">
                {allLocations.map((loc) => (
                  <Badge key={loc} variant="secondary" className="text-[10px]">
                    <MapPin className="h-2.5 w-2.5 mr-0.5" /> {loc}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* POIs list */}
          <div className="space-y-2">
            {category.pois.map((poi) => (
              <POIEditor key={poi.id} poi={poi} locations={allLocations} onRefetch={onRefetch} />
            ))}
          </div>

          {/* Add POI */}
          {showAddPOI ? (
            <AddPOIForm categoryId={category.id} locations={allLocations} onDone={() => { setShowAddPOI(false); onRefetch(); }} onCancel={() => setShowAddPOI(false)} />
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowAddPOI(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> POI toevoegen
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function POIEditor({ poi, locations, onRefetch }: { poi: POI; locations: string[]; onRefetch: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(poi.name);
  const [url, setUrl] = useState(poi.url || "");
  const [desc, setDesc] = useState(poi.description || "");
  const [times, setTimes] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(poi.travel_times).map(([k, v]) => [k, String(v)]))
  );
  const [newLoc, setNewLoc] = useState("");

  const handleSave = async () => {
    const travelTimes: Record<string, number> = {};
    Object.entries(times).forEach(([k, v]) => {
      const n = Number(v);
      if (!isNaN(n) && n > 0) travelTimes[k] = n;
    });
    await supabase.from("pois").update({
      name, url: url || null, description: desc || null, travel_times: travelTimes,
    } as any).eq("id", poi.id);
    toast.success("POI bijgewerkt");
    setEditing(false);
    onRefetch();
  };

  const handleDelete = async () => {
    if (!confirm(`"${poi.name}" verwijderen?`)) return;
    await supabase.from("pois").delete().eq("id", poi.id);
    toast.success("Verwijderd");
    onRefetch();
  };

  const handleAddLocation = () => {
    if (newLoc && !times[newLoc]) {
      setTimes({ ...times, [newLoc]: "" });
      setNewLoc("");
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between p-2 bg-background rounded-md border">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">{poi.name}</span>
            {poi.url && <a href={poi.url} target="_blank" rel="noopener noreferrer" className="text-primary"><ExternalLink className="h-3 w-3" /></a>}
          </div>
          {poi.description && <p className="text-[10px] text-muted-foreground">{poi.description}</p>}
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(poi.travel_times).map(([loc, min]) => (
              <Badge key={loc} variant="outline" className="text-[9px] px-1 py-0">{loc}: {min}m</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setEditing(true)}>Bewerk</Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-background rounded-md border space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam" className="h-7 text-xs" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className="h-7 text-xs" />
      </div>
      <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Beschrijving" className="h-7 text-xs" />

      <div>
        <p className="text-[10px] text-muted-foreground mb-1">Reistijden (minuten)</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(times).map(([loc, val]) => (
            <div key={loc} className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground w-24 truncate">{loc}</span>
              <Input value={val} onChange={(e) => setTimes({ ...times, [loc]: e.target.value })} className="h-6 w-14 text-xs" type="number" />
              <button onClick={() => { const t = { ...times }; delete t[loc]; setTimes(t); }} className="text-destructive text-xs">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1.5">
          <Input value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder="Nieuwe locatie" className="h-6 text-xs flex-1" />
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={handleAddLocation} disabled={!newLoc}>+</Button>
        </div>
      </div>

      <div className="flex gap-1.5">
        <Button size="sm" onClick={handleSave} className="h-7 text-[11px]"><Save className="h-3 w-3 mr-1" /> Opslaan</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-[11px]">Annuleer</Button>
      </div>
    </div>
  );
}

function AddPOIForm({ categoryId, locations, onDone, onCancel }: {
  categoryId: string; locations: string[]; onDone: () => void; onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [times, setTimes] = useState<Record<string, string>>(
    Object.fromEntries(locations.map((l) => [l, ""]))
  );
  const [newLoc, setNewLoc] = useState("");

  const handleSave = async () => {
    if (!name) return;
    const travelTimes: Record<string, number> = {};
    Object.entries(times).forEach(([k, v]) => {
      const n = Number(v);
      if (!isNaN(n) && n > 0) travelTimes[k] = n;
    });
    const { error } = await supabase.from("pois").insert({
      category_id: categoryId, name, url: url || null, description: desc || null, travel_times: travelTimes,
    } as any);
    if (error) { toast.error("Fout"); return; }
    toast.success("POI toegevoegd");
    onDone();
  };

  return (
    <div className="p-3 border border-dashed rounded-md space-y-3">
      <p className="text-xs font-semibold">Nieuwe POI</p>
      <div className="grid grid-cols-2 gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam" className="h-7 text-xs" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className="h-7 text-xs" />
      </div>
      <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Beschrijving" className="h-7 text-xs" />
      <div>
        <p className="text-[10px] text-muted-foreground mb-1">Reistijden (minuten)</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(times).map(([loc, val]) => (
            <div key={loc} className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground w-24 truncate">{loc}</span>
              <Input value={val} onChange={(e) => setTimes({ ...times, [loc]: e.target.value })} className="h-6 w-14 text-xs" type="number" />
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1.5">
          <Input value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder="Nieuwe locatie" className="h-6 text-xs flex-1" />
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => { if (newLoc) { setTimes({ ...times, [newLoc]: "" }); setNewLoc(""); } }} disabled={!newLoc}>+</Button>
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" onClick={handleSave} disabled={!name} className="h-7 text-[11px]"><Plus className="h-3 w-3 mr-1" /> Toevoegen</Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-[11px]">Annuleer</Button>
      </div>
    </div>
  );
}
