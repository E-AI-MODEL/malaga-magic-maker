import { describe, expect, it } from "vitest";
import { loginDestination, pendingInvitePath } from "./start";

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