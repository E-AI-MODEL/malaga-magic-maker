import { describe, expect, it } from "vitest";
import { detectMapsPlatform, mapsUrl } from "./maps";

describe("mapsUrl", () => {
  it("prefers coordinates", () => {
    const item = { title: "Villa Rosa", location_name: "Fiesole", metadata: { latitude: 43.8, longitude: 11.29, address: "Via X 1" } };
    expect(mapsUrl(item, "Florence", "other")).toBe("https://www.google.com/maps/search/?api=1&query=43.8%2C11.29");
    expect(mapsUrl(item, "Florence", "apple")).toBe("https://maps.apple.com/?q=Villa%20Rosa&ll=43.8%2C11.29");
  });
  it("uses the address when there are no coordinates", () => {
    const item = { title: "Villa", metadata: { address: "Via Roma 5, Firenze" } };
    expect(mapsUrl(item, "Florence", "other")).toBe("https://www.google.com/maps/search/?api=1&query=Via%20Roma%205%2C%20Firenze");
    expect(mapsUrl(item, "Florence", "apple")).toBe("https://maps.apple.com/?q=Via%20Roma%205%2C%20Firenze");
  });
  it("uses the location name plus the destination", () => {
    expect(mapsUrl({ title: "Diner", location_name: "Trattoria Mario" }, "Florence", "other"))
      .toBe("https://www.google.com/maps/search/?api=1&query=Trattoria%20Mario%2C%20Florence");
  });
  it("returns null without any location", () => {
    expect(mapsUrl({ title: "Vlucht KL1699", metadata: {} }, "Florence", "other")).toBeNull();
    expect(mapsUrl({ title: "Trein", location_name: "  " }, "Florence", "apple")).toBeNull();
  });
});

describe("detectMapsPlatform", () => {
  it("separates iOS from Android", () => {
    expect(detectMapsPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("apple");
    expect(detectMapsPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("other");
  });
});
