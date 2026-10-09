import { verifyUnsubscribeToken } from "../_shared/unsubscribe-token.ts";

// GET only shows a confirmation page: mail clients and virus scanners open links automatically.
// Only POST (the button, or a one-click POST) switches e-mail reminders off.

export type UnsubscribeDeps = {
  getSecret: () => Promise<string | null>;
  disableEmailReminders: (userId: string) => Promise<boolean>;
};

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const page = (status: number, inner: string) =>
  new Response(
    `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Vakansie</title></head>` +
      `<body style="margin:0;background:#f4f1ea;font-family:Barlow,Arial,sans-serif;color:#1d201f">` +
      `<main style="max-width:420px;margin:15vh auto;padding:0 24px"><p style="font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#ff6a00;font-size:13px">Vakansie</p>` +
      `${inner}<p><a href="https://vakansie.app/profiel" style="color:#1d201f">Naar Profiel</a></p></main></body></html>`,
    { status, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );

const text = (message: string) => `<p style="font-size:18px;line-height:1.5">${message}</p>`;
const INVALID = "Deze afmeldlink is ongeldig of verlopen. Je kunt herinneringen uitzetten in Profiel.";
const FAILED = "Afmelden lukt nu even niet. Probeer het later opnieuw.";
export const DONE = "Je krijgt geen herinneringen meer per e-mail. Je kunt ze weer aanzetten in Profiel.";
export const QUESTION = "Wil je geen herinneringen meer per e-mail?";

async function tokenFrom(req: Request): Promise<string> {
  const fromUrl = new URL(req.url).searchParams.get("token");
  if (req.method !== "POST") return fromUrl || "";
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const value = (await req.formData().catch(() => null))?.get("token");
    if (typeof value === "string" && value) return value;
  }
  return fromUrl || "";
}

export async function handleUnsubscribe(req: Request, deps: UnsubscribeDeps, now = new Date()): Promise<Response> {
  if (req.method !== "GET" && req.method !== "POST") return page(405, text("Deze actie is niet mogelijk."));
  const token = await tokenFrom(req);
  const secret = await deps.getSecret();
  const userId = secret ? await verifyUnsubscribeToken(token, secret, now) : null;
  if (!userId) return page(400, text(INVALID));

  if (req.method === "GET") {
    return page(200, text(QUESTION) +
      `<form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}">` +
      `<button type="submit" style="background:#ff6a00;color:#fff;border:0;border-radius:4px;padding:12px 20px;font-size:15px;font-weight:bold;cursor:pointer">Ja, afmelden</button></form>`);
  }
  return (await deps.disableEmailReminders(userId)) ? page(200, text(DONE)) : page(500, text(FAILED));
}
