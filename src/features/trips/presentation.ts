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
