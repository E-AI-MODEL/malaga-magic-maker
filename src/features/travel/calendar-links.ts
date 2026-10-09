export function calendarLinks(projectId: string, token: string) {
  const https = `https://${projectId}.supabase.co/functions/v1/trip-calendar?token=${encodeURIComponent(token)}`;
  const webcal = https.replace(/^https:\/\//, "webcal://");
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
  };
}
