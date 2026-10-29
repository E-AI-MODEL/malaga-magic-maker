import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { receiptFileError, type ReceiptSuggestion } from "./receipt";
import { recognizeReceipt } from "./receipt-client";

type Props = { tripId: string; onProposal: (proposal: ReceiptSuggestion) => void };

/** Mounted only while adding an expense. No storage, object URLs or raw OCR state. */
export function ReceiptInput({ tripId, onProposal }: Props) {
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; pending.current?.abort(); }, []);

  const clear = () => {
    generation.current += 1;
    pending.current?.abort();
    pending.current = null;
    setImage(""); setBusy(false); setConsent(false); setError("");
  };
  const choose = async (file?: File) => {
    clear();
    if (!file) return;
    const invalid = receiptFileError(file);
    if (invalid) { setError(invalid); return; }
    const version = generation.current;
    setBusy(true);
    try {
      // Decode and re-encode to strip EXIF, embedded metadata and original filename.
      const bitmap = await createImageBitmap(file);
      try {
        if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 24000000) throw new Error("image_size");
        const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("image_context");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.9);
        canvas.width = 0; canvas.height = 0;
        if (version === generation.current) setImage(data);
      } finally { bitmap.close(); }
    } catch { if (version === generation.current) setError("Deze foto werkt niet. Kies een andere of vul het zelf in."); }
    finally { if (version === generation.current) setBusy(false); }
  };
  const recognize = async () => {
    if (!image || !consent || busy) return;
    const version = ++generation.current;
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError("");
    try {
      const proposal = await recognizeReceipt(tripId, image, controller.signal);
      if (version === generation.current) onProposal(proposal);
    } catch (caught) {
      if (version === generation.current && !controller.signal.aborted) setError(caught instanceof Error ? caught.message : "De foto lezen lukte niet. Vul het zelf in.");
    } finally { if (version === generation.current) { setBusy(false); pending.current = null; } }
  };

  return <section className="space-y-3 border-b border-border pb-5" aria-label="Bonfoto">
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => fileRef.current?.click()} disabled={busy}><ImagePlus className="mr-2 h-5 w-5" />Foto kiezen</Button>
      <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => cameraRef.current?.click()} disabled={busy}><Camera className="mr-2 h-5 w-5" />Foto maken</Button>
    </div>
    <input ref={fileRef} aria-label="Kies bonfoto" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={cameraRef} aria-label="Maak bonfoto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
    {image && <>
      <img src={image} alt="Gekozen bonnetje ter controle" className="max-h-64 w-full object-contain" />
      <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" disabled={busy} /><span>AI oncijfert je bonnetje. De foto wordt nergens bewaard.</span></label>
      <div className="flex flex-wrap gap-2"><Button type="button" className="h-12 flex-1" disabled={!consent || busy} onClick={() => void recognize()}>{busy && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}Bonnetje uitlezen</Button><Button type="button" variant="ghost" className="h-12" onClick={clear}><X className="mr-2 h-4 w-4" />{busy ? "Stoppen" : "Foto verwijderen"}</Button></div>
    </>}
    <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{busy ? "Foto verwerken…" : error || "Of vul het zelf in."}</p>
  </section>;
}