import { describe, expect, it } from "vitest";
import { loginDestination, pendingInvitePath, signedInStartPath } from "./start";

const first = { id: "first", status: "planning" };
const second = { id: "second", status: "planning" };
const archived = { id: "archived", status: "archived" };

describe("signed-in entry destination", () => {
  it("opens the only active trip even when a different trip was remembered", () => {
    expect(signedInStartPath([first, archived], archived.id)).toBe("/trip/first");
  });
  it("opens the remembered active trip with multiple active trips", () => {
    expect(signedInStartPath([first, second, archived], second.id)).toBe("/trip/second");
  });
  it("shows the list with multiple active trips and no remembered trip", () => {
    expect(signedInStartPath([first, second], null)).toBe("/trips");
  });
  it("ignores an archived remembered trip", () => {
    expect(signedInStartPath([first, second, archived], archived.id)).toBe("/trips");
  });
  it("ignores a remembered trip the user no longer has access to", () => {
    expect(signedInStartPath([first, second], "removed")).toBe("/trips");
  });
  it("shows the empty list when there are no trips", () => {
    expect(signedInStartPath([], first.id)).toBe("/trips");
  });
  it("shows the list rather than opening an archived trip", () => {
    expect(signedInStartPath([archived], archived.id)).toBe("/trips");
  });
});

describe("pending invite", () => {
  it("continues a stored invite after login", () => {
    expect(pendingInvitePath(() => "abc123_X-Y")).toBe("/join/abc123_X-Y");
  });
  it("ignores missing or unsafe codes", () => {
    expect(pendingInvitePath(() => null)).toBeNull();
    expect(pendingInvitePath(() => "../etc")).toBeNull();
    expect(pendingInvitePath(() => "a b")).toBeNull();
  });
});

describe("login destination", () => {
  it("uses the entry selection when no explicit destination is given", () => {
    expect(loginDestination(null)).toBe("/");
  });
  it("preserves an explicit trip destination", () => {
    expect(loginDestination("/trip/second/reis")).toBe("/trip/second/reis");
  });
  it("preserves an invite destination", () => {
    expect(loginDestination("/join/invite-code")).toBe("/join/invite-code");
  });
  it("refuses external destinations", () => {
    expect(loginDestination("//example.com")).toBe("/");
    expect(loginDestination("/\\example.com")).toBe("/");
  });
});