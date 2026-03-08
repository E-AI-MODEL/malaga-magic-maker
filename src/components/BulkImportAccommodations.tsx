import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTrip } from "@/contexts/TripContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Loader2, FileJson, CheckCircle2, AlertCircle } from "lucide-react";

interface BulkResult {
  success: number;
  failed: number;
  errors: string[];
}

const REQUIRED_FIELDS = ["name", "location_label", "lat", "lng"] as const;

const CSV_TEMPLATE = `name,location_label,lat,lng,type,bedrooms,bathrooms,max_guests,fixed_beds_count,total_price_3_nights,golf_minutes,beach_meters,parking,cancellation_type,tags,listing_url,notes
"Villa Ejemplo","Fuengirola",36.544,-4.625,"villa",3,2,6,6,1200,20,300,"free","free","pool;airco;wifi","https://example.com","Mooie villa"`;

interface Props {
  onImported: () => void;
}

export function BulkImportAccommodations({ onImported }: Props) {
  const { activeTrip } = useTrip();
  const [input, setInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): Record<string, any>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    
    // Parse header
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    
    return lines.slice(1).map(line => {
      // Simple CSV parser handling quoted fields
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
        current += char;
      }
      values.push(current.trim());

      const obj: Record<string, any> = {};
      headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
      return obj;
    });
  };

  const normalizeRow = (raw: Record<string, any>) => {
    const tags = typeof raw.tags === "string"
      ? raw.tags.split(";").map((t: string) => t.trim()).filter(Boolean)
      : Array.isArray(raw.tags) ? raw.tags : [];

    return {
      name: String(raw.name || ""),
      location_label: String(raw.location_label || ""),
      lat: parseFloat(raw.lat) || 36.7,
      lng: parseFloat(raw.lng) || -4.4,
      type: String(raw.type || "apartment"),
      bedrooms: parseInt(raw.bedrooms) || 1,
      bathrooms: parseInt(raw.bathrooms) || 1,
      max_guests: parseInt(raw.max_guests) || 2,
      fixed_beds_count: parseInt(raw.fixed_beds_count) || 2,
      total_price_3_nights: raw.total_price_3_nights ? parseFloat(raw.total_price_3_nights) : null,
      golf_km: raw.golf_km ? parseFloat(raw.golf_km) : null,
      golf_minutes: raw.golf_minutes ? parseInt(raw.golf_minutes) : null,
      beach_meters: raw.beach_meters ? parseInt(raw.beach_meters) : null,
      agp_minutes: raw.agp_minutes ? parseInt(raw.agp_minutes) : null,
      parking: String(raw.parking || "unknown"),
      cancellation_type: String(raw.cancellation_type || "unknown"),
      tags,
      listing_url: raw.listing_url || null,
      notes: raw.notes || null,
      image_urls: Array.isArray(raw.image_urls) ? raw.image_urls : [],
      sources: Array.isArray(raw.sources) ? raw.sources : [],
      trip_id: activeTrip?.id || null,
    };
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    try {
      let rows: Record<string, any>[];
      if (format === "json") {
        rows = JSON.parse(input);
        if (!Array.isArray(rows)) rows = [rows];
      } else {
        rows = parseCSV(input);
      }

      if (rows.length === 0) {
        toast.error("Geen rijen gevonden");
        setImporting(false);
        return;
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const normalized = normalizeRow(rows[i]);
        
        // Validate required fields
        const missing = REQUIRED_FIELDS.filter(f => !normalized[f]);
        if (missing.length > 0) {
          errors.push(`Rij ${i + 1}: ontbrekend: ${missing.join(", ")}`);
          failed++;
          continue;
        }

        const { error } = await supabase.from("accommodations").insert(normalized);
        if (error) {
          errors.push(`Rij ${i + 1} (${normalized.name}): ${error.message}`);
          failed++;
        } else {
          success++;
        }
      }

      setResult({ success, failed, errors });
      if (success > 0) {
        toast.success(`${success} accommodatie(s) geïmporteerd`);
        onImported();
      }
      if (failed > 0) {
        toast.error(`${failed} rij(en) mislukt`);
      }
    } catch (e: any) {
      toast.error("Parse error: " + (e.message || "Ongeldig formaat"));
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setInput(text);
      if (file.name.endsWith(".json")) setFormat("json");
      else setFormat("csv");
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-secondary/30">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Bulk import accommodaties
      </p>

      {/* Format toggle */}
      <div className="flex gap-2">
        <Button size="sm" variant={format === "csv" ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setFormat("csv")}>
          CSV
        </Button>
        <Button size="sm" variant={format === "json" ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setFormat("json")}>
          <FileJson className="h-3 w-3 mr-1" /> JSON
        </Button>
      </div>

      {/* File upload */}
      <label className="inline-flex items-center gap-2 text-xs bg-primary/10 text-primary rounded-lg px-3 py-2 cursor-pointer hover:bg-primary/20 transition-colors font-medium">
        <Upload className="h-3.5 w-3.5" /> Upload bestand (.csv / .json)
        <input ref={fileRef} type="file" accept=".csv,.json,.txt" className="hidden" onChange={handleFileUpload} />
      </label>

      {/* Textarea */}
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={format === "csv" ? CSV_TEMPLATE : '[\n  { "name": "Villa Ejemplo", "location_label": "Fuengirola", "lat": 36.54, "lng": -4.62 }\n]'}
        rows={8}
        className="text-xs font-mono"
      />

      <p className="text-[10px] text-muted-foreground">
        Verplichte velden: <span className="font-semibold">name, location_label, lat, lng</span>. 
        Tags in CSV gescheiden door <code>;</code>.
      </p>

      {/* Import button */}
      <Button onClick={handleImport} disabled={importing || !input.trim()} className="w-full h-9 text-xs font-semibold">
        {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
        Importeer {format === "csv" ? "CSV" : "JSON"}
      </Button>

      {/* Result */}
      {result && (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-4 text-xs">
            {result.success > 0 && (
              <span className="flex items-center gap-1 text-primary font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> {result.success} geïmporteerd
              </span>
            )}
            {result.failed > 0 && (
              <span className="flex items-center gap-1 text-destructive font-semibold">
                <AlertCircle className="h-3.5 w-3.5" /> {result.failed} mislukt
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="text-[10px] text-destructive space-y-0.5 max-h-32 overflow-y-auto">
              {result.errors.map((err, i) => <p key={i}>{err}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
