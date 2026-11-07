import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), signOut: vi.fn(), onAuthStateChange: vi.fn(), from: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: mocks, from: mocks.from } }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: {} } }));
vi.mock("@/config/access", () => ({ PRELAUNCH_ACCESS_RESTRICTED: false }));

function SessionView() {
  const { user, loading } = useAuth();
  return <output>{loading ? "loading" : user?.id || "signed-out"}</output>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "persisted-user" } } } });
  mocks.from.mockImplementation(() => ({ select: () => ({ eq: () => {
    const result = Promise.resolve({ data: [] });
    return Object.assign(result, { single: () => Promise.resolve({ data: { id: "persisted-user", display_name: "Test", username: "test" } }) });
  } }) }));
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe("persistent sign-in", () => {
  it.each([null, "old-version"])("restores the saved session with version marker %s", async (version) => {
    if (version) localStorage.setItem("auth-version", version);
    render(<AuthProvider><SessionView /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("persisted-user")).toBeTruthy());
    expect(mocks.getSession).toHaveBeenCalledOnce();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});