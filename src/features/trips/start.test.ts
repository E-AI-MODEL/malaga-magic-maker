import { describe, expect, it } from "vitest";
import { loginDestination, pendingInvitePath, signedInEntryPath } from "./start";

describe("Home landing", () => {
  it("always opens Home at signed-in entry", () => {
    expect(signedInEntryPath(null)).toBe("/trips");
    expect(signedInEntryPath(pendingInvitePath(() => ""))).toBe("/trips");
  });
  it("gives an invitation priority over Home", () => {
    expect(signedInEntryPath(pendingInvitePath(() => "invitation"))).toBe("/join/invitation");
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