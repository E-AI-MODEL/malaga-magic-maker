function dateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function todayKey(now: Date) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export function tripTimingLabel(startDate: string | null, endDate: string | null, now = new Date()) {
  if (!startDate) return "Data nog niet gekozen";

  const start = dateKey(startDate);
  if (start == null) return "Data nog niet gekozen";

  const today = todayKey(now);
  const day = 86_400_000;
  const daysUntilStart = Math.round((start - today) / day);

  if (endDate) {
    const end = dateKey(endDate);
    if (end != null && end < today) return "Afgelopen";
    if (start <= today && end != null && end >= today) return "Nu op reis";
  } else if (start < today) {
    return "Gestart";
  }

  if (daysUntilStart === 0) return "Vandaag vertrek";
  if (daysUntilStart === 1) return "Morgen vertrek";
  if (daysUntilStart > 1) return `Nog ${daysUntilStart} dagen`;
  return "Gestart";
}

const SHORT_MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** Short range: "18–23 okt 2026", "28 sep – 3 okt 2026", "28 dec 2026 – 3 jan 2027". */
export function formatTripDateRange(startDate: string | null, endDate: string | null) {
  const parse = (v: string | null) => {
    const m = v ? /^(\d{4})-(\d{2})-(\d{2})/.exec(v) : null;
    return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
  };
  const a = parse(startDate);
  const b = parse(endDate);
  if (!a && !b) return "Data nog niet gekozen";
  if (!a || !b) { const x = (a || b)!; return `${x.d} ${SHORT_MONTHS[x.m]} ${x.y}`; }
  if (a.y !== b.y) return `${a.d} ${SHORT_MONTHS[a.m]} ${a.y} – ${b.d} ${SHORT_MONTHS[b.m]} ${b.y}`;
  if (a.m !== b.m) return `${a.d} ${SHORT_MONTHS[a.m]} – ${b.d} ${SHORT_MONTHS[b.m]} ${b.y}`;
  if (a.d === b.d) return `${a.d} ${SHORT_MONTHS[a.m]} ${a.y}`;
  return `${a.d}–${b.d} ${SHORT_MONTHS[a.m]} ${a.y}`;
}
