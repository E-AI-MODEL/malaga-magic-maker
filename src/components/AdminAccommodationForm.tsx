import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTrip } from "@/contexts/TripContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { Loader2, Sparkles, Save, X, Upload, Image as ImageIcon, Trash2 } from "lucide-react";

const TAG_OPTIONS = ["pool", "airco", "wifi", "parking", "terras", "zeezicht", "tuin", "bbq", "gym", "spa"];
const TYPE_OPTIONS = ["apartment", "villa", "hotel", "resort", "house"];

interface AccommodationFormData {
  name: string;
  listing_url: string;
  type: string;
  location_label: string;
  lat: number;
  lng: number;
  total_price_3_nights: number | null;
  price_notes: string;
  bedrooms: number;
  bathrooms: number;
  fixed_beds_count: number;
  max_guests: number;
  golf_km: number | null;
  golf_minutes: number | null;
  beach_meters: number | null;
  agp_minutes: number | null;
  tags: string[];
  parking: string;
  cancellation_type: string;
  image_urls: string[];
  notes: string;
  sources: string;
}

const emptyForm: AccommodationFormData = {
  name: "", listing_url: "", type: "apartment", location_label: "",
  lat: 36.7, lng: -4.4, total_price_3_nights: null, price_notes: "",
  bedrooms: 1, bathrooms: 1, fixed_beds_count: 2, max_guests: 2,
  golf_km: null, golf_minutes: null, beach_meters: null, agp_minutes: null,
  tags: [], parking: "unknown", cancellation_type: "unknown",
  image_urls: [], notes: "", sources: "",
};

interface Props {
  editId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function AdminAccommodationForm({ editId, onSaved, onCancel }: Props) {
  const { activeTrip } = useTrip();
  const [form, setForm] = useState<AccommodationFormData>(emptyForm);
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState("");

  useEffect(() => {
    if (editId) loadExisting(editId);
  }, [editId]);

  const loadExisting = async (id: string) => {
    const { data } = await supabase.from("accommodations").select("*").eq("id", id).single();
    if (!data) return;
    setForm({
      name: data.name, listing_url: data.listing_url || "", type: data.type,
      location_label: data.location_label, lat: data.lat, lng: data.lng,
      total_price_3_nights: data.total_price_3_nights, price_notes: data.price_notes || "",
      bedrooms: data.bedrooms, bathrooms: data.bathrooms, fixed_beds_count: data.fixed_beds_count,
      max_guests: data.max_guests, golf_km: data.golf_km, golf_minutes: data.golf_minutes,
      beach_meters: data.beach_meters, agp_minutes: data.agp_minutes,
      tags: data.tags || [], parking: data.parking, cancellation_type: data.cancellation_type,
      image_urls: data.image_urls || [],
      notes: data.notes || "",
      sources: JSON.stringify(data.sources || [], null, 2),
    });
  };

  const set = (key: keyof AccommodationFormData, value: any) => setForm(f => ({ ...f, [key]: value }));
  const toggleTag = (tag: string) => setForm(f => ({
    ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
  }));

  const handleImageUpload = async (files: FileList) => {
    setUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("accommodation-images")
        .upload(path, file);

      if (error) {
        toast.error(`Upload mislukt: ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("accommodation-images")
        .getPublicUrl(path);

      newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length > 0) {
      setForm(f => ({ ...f, image_urls: [...f.image_urls, ...newUrls] }));
      toast.success(`${newUrls.length} afbeelding(en) geüpload`);
    }
    setUploading(false);
  };

  const handleRemoveImage = (url: string) => {
    setForm(f => ({ ...f, image_urls: f.image_urls.filter(u => u !== url) }));
  };

  const handleAddManualUrl = () => {
    const url = manualUrlInput.trim();
    if (!url) return;
    setForm(f => ({ ...f, image_urls: [...f.image_urls, url] }));
    setManualUrlInput("");
  };

  const handleScrape = async () => {
    if (!form.listing_url) { toast.error("Vul eerst een URL in"); return; }
    setScraping(true);
    try {
      const res = await firecrawlApi.scrape(form.listing_url, { formats: ["markdown"] });
      if (!res.success) {
        toast.error(res.error || "Scrape mislukt — vul handmatig in");
        return;
      }
      const md = res.data?.markdown || res.data?.data?.markdown || "";
      const titleMatch = md.match(/^#\s+(.+)/m);
      if (titleMatch && !form.name) set("name", titleMatch[1].trim());
      toast.success("Scrape voltooid — controleer de velden");
    } catch {
      toast.error("Scrape niet beschikbaar — vul handmatig in");
    } finally {
      setScraping(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.location_label) { toast.error("Naam en locatie zijn verplicht"); return; }
    setSaving(true);
    const payload = {
      name: form.name, listing_url: form.listing_url || null, type: form.type,
      location_label: form.location_label, lat: form.lat, lng: form.lng,
      total_price_3_nights: form.total_price_3_nights, price_notes: form.price_notes || null,
      bedrooms: form.bedrooms, bathrooms: form.bathrooms, fixed_beds_count: form.fixed_beds_count,
      max_guests: form.max_guests, golf_km: form.golf_km, golf_minutes: form.golf_minutes,
      beach_meters: form.beach_meters, agp_minutes: form.agp_minutes,
      tags: form.tags, parking: form.parking, cancellation_type: form.cancellation_type,
      image_urls: form.image_urls,
      notes: form.notes || null,
      sources: (() => { try { return JSON.parse(form.sources || "[]"); } catch { return []; } })(),
      trip_id: activeTrip?.id || null,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("accommodations").update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("accommodations").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error("Opslaan mislukt: " + error.message); return; }
    toast.success(editId ? "Accommodatie bijgewerkt" : "Accommodatie toegevoegd");
    onSaved();
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-secondary/30">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {editId ? "Accommodatie bewerken" : "Nieuwe accommodatie"}
        </p>
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>

      {/* URL + Scrape */}
      <div className="space-y-1.5">
        <Label className="text-xs">Listing URL</Label>
        <div className="flex gap-2">
          <Input value={form.listing_url} onChange={e => set("listing_url", e.target.value)} placeholder="https://booking.com/..." className="flex-1 h-9 text-xs" />
          <Button size="sm" variant="outline" onClick={handleScrape} disabled={scraping} className="h-9 text-xs">
            {scraping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="ml-1">Auto-fill</span>
          </Button>
        </div>
      </div>

      {/* Core fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Naam *</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Locatie *</Label>
          <Input value={form.location_label} onChange={e => set("location_label", e.target.value)} placeholder="Mijas, Costa del Sol" className="h-9 text-xs" />
        </div>
      </div>

      {/* Price & capacity */}
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Prijs 3n (€)</Label>
          <Input type="number" value={form.total_price_3_nights ?? ""} onChange={e => set("total_price_3_nights", e.target.value ? Number(e.target.value) : null)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Slaapkamers</Label>
          <Input type="number" value={form.bedrooms} onChange={e => set("bedrooms", Number(e.target.value))} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Badkamers</Label>
          <Input type="number" value={form.bathrooms} onChange={e => set("bathrooms", Number(e.target.value))} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max gasten</Label>
          <Input type="number" value={form.max_guests} onChange={e => set("max_guests", Number(e.target.value))} className="h-9 text-xs" />
        </div>
      </div>

      {/* Distances */}
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Golf km</Label>
          <Input type="number" value={form.golf_km ?? ""} onChange={e => set("golf_km", e.target.value ? Number(e.target.value) : null)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Golf min</Label>
          <Input type="number" value={form.golf_minutes ?? ""} onChange={e => set("golf_minutes", e.target.value ? Number(e.target.value) : null)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Strand m</Label>
          <Input type="number" value={form.beach_meters ?? ""} onChange={e => set("beach_meters", e.target.value ? Number(e.target.value) : null)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">AGP min</Label>
          <Input type="number" value={form.agp_minutes ?? ""} onChange={e => set("agp_minutes", e.target.value ? Number(e.target.value) : null)} className="h-9 text-xs" />
        </div>
      </div>

      {/* Coords */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Lat</Label>
          <Input type="number" step="0.001" value={form.lat} onChange={e => set("lat", Number(e.target.value))} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Lng</Label>
          <Input type="number" step="0.001" value={form.lng} onChange={e => set("lng", Number(e.target.value))} className="h-9 text-xs" />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tags</Label>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map(tag => (
            <label key={tag} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={form.tags.includes(tag)} onCheckedChange={() => toggleTag(tag)} />
              <span className="text-xs">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Parking & cancellation */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Parking</Label>
          <select value={form.parking} onChange={e => set("parking", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
            <option value="unknown">Onbekend</option>
            <option value="free">Gratis</option>
            <option value="paid">Betaald</option>
            <option value="none">Geen</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Annulering</Label>
          <select value={form.cancellation_type} onChange={e => set("cancellation_type", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
            <option value="unknown">Onbekend</option>
            <option value="free">Gratis</option>
            <option value="partial">Gedeeltelijk</option>
            <option value="strict">Strikt</option>
          </select>
        </div>
      </div>

      {/* Fixed beds */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Vaste bedden</Label>
          <Input type="number" value={form.fixed_beds_count} onChange={e => set("fixed_beds_count", Number(e.target.value))} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prijsnotities</Label>
          <Input value={form.price_notes} onChange={e => set("price_notes", e.target.value)} placeholder="incl. schoonmaak" className="h-9 text-xs" />
        </div>
      </div>

      {/* Images — Upload + URL + Preview */}
      <div className="space-y-3">
        <Label className="text-xs flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          Afbeeldingen ({form.image_urls.length})
        </Label>

        {/* Thumbnails */}
        {form.image_urls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {form.image_urls.map((url, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                <img src={url} alt="" className="w-full h-20 object-cover" loading="lazy" />
                <button
                  onClick={() => handleRemoveImage(url)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <label className="inline-flex items-center gap-2 text-xs bg-primary/10 text-primary rounded-lg px-3 py-2.5 cursor-pointer hover:bg-primary/20 transition-colors w-full justify-center font-medium">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploaden..." : "Foto's uploaden"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && e.target.files.length > 0 && handleImageUpload(e.target.files)}
            disabled={uploading}
          />
        </label>

        {/* Manual URL input */}
        <div className="flex gap-2">
          <Input
            value={manualUrlInput}
            onChange={e => setManualUrlInput(e.target.value)}
            placeholder="Of plak een afbeelding-URL..."
            className="flex-1 h-8 text-xs"
            onKeyDown={e => e.key === "Enter" && handleAddManualUrl()}
          />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleAddManualUrl} disabled={!manualUrlInput.trim()}>
            Toevoegen
          </Button>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs">Notities</Label>
        <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className="text-xs" />
      </div>

      {/* Sources JSON */}
      <div className="space-y-1">
        <Label className="text-xs">Bronnen (JSON)</Label>
        <Textarea value={form.sources} onChange={e => set("sources", e.target.value)} rows={2} placeholder='[{"platform":"booking","url":"...","label":"Booking.com"}]' className="text-xs font-mono" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1 h-9 text-xs font-semibold">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          {editId ? "Bijwerken" : "Toevoegen"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="h-9 text-xs">Annuleren</Button>
      </div>
    </div>
  );
}
