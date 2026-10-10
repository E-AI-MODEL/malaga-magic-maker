import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatTripDateRange } from "@/features/trips/presentation";

const sql = readFileSync("drizzle/migrations/0014_choose_trip_idea_rpcs.sql", "utf8");
const choose = sql.slice(sql.indexOf("FUNCTION public.choose_trip_idea"), sql.indexOf("FUNCTION public.undo_trip_idea_choice"));
const undo = sql.slice(sql.indexOf("FUNCTION public.undo_trip_idea_choice"));
const reis = readFileSync("src/pages/TripReis.tsx", "utf8");

describe("Dit wordt het: server choice and undo", () => {
  it("only organizers and platform admins may choose or undo", () => {
    for (const body of [choose, undo]) {
      expect(body).toContain("public.is_trip_organizer(v_uid");
      expect(body).toContain("public.has_role(v_uid, 'admin')");
      expect(body).toContain("RAISE EXCEPTION 'not_allowed'");
    }
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public.choose_trip_idea\(uuid\) FROM PUBLIC, anon/);
  });
  it("a fellow traveler does not get the button", () => {
    expect(reis).toContain("const canChoose = isOrganizer || isAdmin;");
    expect(reis).toContain("De organisator kiest; stem mee via Samen.");
  });
  it("organizer choice plans the stay at 15:00/11:00, removes other stay ideas and closes the stay choice", () => {
    expect(choose).toContain("time '15:00'");
    expect(choose).toContain("time '11:00'");
    expect(choose).toMatch(/DELETE FROM public.trip_items t\s+WHERE t.trip_id = v_item.trip_id AND t.type = 'stay' AND t.status = 'idea'/);
    expect(choose).toContain("btrim(title) = 'Waar verblijven we?'");
    expect(choose).toContain("to_jsonb(t)");
  });
  it("undo restores rows with their original id and maker, only for this trip and within 10 minutes", () => {
    expect(undo).toContain("jsonb_populate_record(NULL::public.trip_items, r)");
    expect(undo).toContain("v_row.trip_id IS DISTINCT FROM p_trip_id");
    expect(undo).toContain("interval '10 minutes'");
    expect(undo).not.toMatch(/created_by\s*:=\s*v_uid/);
    expect(undo).toContain("SET status = 'open'");
  });
});

describe("short trip dates", () => {
  it("same month", () => expect(formatTripDateRange("2026-10-18", "2026-10-23")).toBe("18–23 okt 2026"));
  it("different months", () => expect(formatTripDateRange("2026-09-28", "2026-10-03")).toBe("28 sep – 3 okt 2026"));
  it("different years", () => expect(formatTripDateRange("2026-12-28", "2027-01-03")).toBe("28 dec 2026 – 3 jan 2027"));
  it("no dates", () => expect(formatTripDateRange(null, null)).toBe("Data nog niet gekozen"));
});
