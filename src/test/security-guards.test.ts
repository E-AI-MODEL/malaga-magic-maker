import { describe, expect, it } from "vitest";
import {
  isAllowedReturnUrl,
  isSafePublicHttpsUrl,
  parseAllowedOrigins,
} from "../../supabase/functions/_shared/url-guards";
import { normalizeMessages } from "../../supabase/functions/trip-ai-chat/messages";

describe("checkout returnUrl", () => {
  const allowed = parseAllowedOrigins("https://vakansie.app, https://id-preview--x.lovable.app");
  it("accepts exact allowed origins", () => {
    expect(isAllowedReturnUrl("https://vakansie.app/profiel?checkout=ok", allowed)).toBe(true);
    expect(isAllowedReturnUrl("https://id-preview--x.lovable.app/steun", allowed)).toBe(true);
  });
  it("rejects other origins", () => {
    expect(isAllowedReturnUrl("https://evil.example/profiel", allowed)).toBe(false);
    expect(isAllowedReturnUrl("https://vakansie.app.evil.example/", allowed)).toBe(false);
    expect(isAllowedReturnUrl("http://vakansie.app/", allowed)).toBe(false);
    expect(isAllowedReturnUrl("https://vakansie.app:8443/", allowed)).toBe(false);
    expect(isAllowedReturnUrl("not a url", allowed)).toBe(false);
  });
  it("rejects everything when no origins are configured", () => {
    expect(isAllowedReturnUrl("https://vakansie.app/", parseAllowedOrigins(""))).toBe(false);
  });
});

describe("accommodation lookup url", () => {
  it("accepts normal https hosts", () => {
    expect(isSafePublicHttpsUrl("https://www.booking.com/hotel/it/x.html")).toBe(true);
    expect(isSafePublicHttpsUrl("https://airbnb.nl:443/rooms/1")).toBe(true);
  });
  it.each([
    "http://www.booking.com/",
    "https://127.0.0.1/",
    "https://10.0.0.1/",
    "https://[::1]/",
    "https://localhost/",
    "https://printer.local/",
    "https://db.internal/",
    "https://intranet/",
    "https://booking.com:8080/",
    "https://user:pw@booking.com/",
    "ftp://booking.com/",
  ])("rejects %s", (url) => {
    expect(isSafePublicHttpsUrl(url)).toBe(false);
  });
});

describe("Hansie message history", () => {
  it("keeps only the last 12 messages", () => {
    const msgs = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `m${i}` }));
    msgs.push({ role: "user", content: "laatste" });
    expect(normalizeMessages(msgs)).toHaveLength(12);
  });
  it("requires the last message to be from the user", () => {
    expect(normalizeMessages([{ role: "user", content: "a" }, { role: "assistant", content: "b" }])).toBeNull();
  });
  it("caps assistant messages at 4000 characters", () => {
    expect(normalizeMessages([{ role: "assistant", content: "x".repeat(4001) }, { role: "user", content: "a" }])).toBeNull();
    expect(normalizeMessages([{ role: "assistant", content: "x".repeat(4000) }, { role: "user", content: "a" }])).toHaveLength(2);
  });
  it("rejects system roles", () => {
    expect(normalizeMessages([{ role: "system", content: "a" }, { role: "user", content: "b" }])).toBeNull();
  });
});
