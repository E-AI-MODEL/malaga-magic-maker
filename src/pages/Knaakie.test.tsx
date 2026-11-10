import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Knaakie from "./Knaakie";

const { state, createTrip, openTrip } = vi.hoisted(() => ({
  state: { trips: [] as { id: string; name: string }[] },
  createTrip: vi.fn(),
  openTrip: vi.fn(async (id: string) => state.trips.find((trip) => trip.id === id) || state.trips[0] || null),
}));

vi.mock("@/components/AppLayout", () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/features/together/KostenSection", () => ({ KostenSection: () => <p>Kosten van deze Knaakie</p> }));
vi.mock("@/contexts/TripContext", () => ({
  useTrip: () => ({
    user: { id: "u1" },
    loading: false,
    userTrips: state.trips,
    activeTrip: state.trips[0] ?? null,
    openTrip,
    createTrip,
  }),
}));

function UrlProbe() {
  const { search } = useLocation();
  return <output data-testid="url">{search}</output>;
}

const start = () =>
  render(
    <MemoryRouter initialEntries={["/knaakie"]}>
      <Routes>
        <Route path="/knaakie" element={<Knaakie />} />
      </Routes>
      <UrlProbe />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  state.trips = [];
  createTrip.mockReset();
  openTrip.mockClear();
});

describe("new Knaakie pot", () => {
  it("offers the create action next to the pot list and asks for one name", async () => {
    state.trips = [{ id: "trip-one", name: "Zomer 2027" }];
    start();
    fireEvent.click(await screen.findByRole("button", { name: "Nieuwe Knaakie" }));
    expect(await screen.findByText("Geef je Knaakie een naam")).toBeInTheDocument();
    expect(screen.getByLabelText("Naam van de Knaakie")).toBeInTheDocument();
  });

  it("creates the pot with the typed name and opens it", async () => {
    state.trips = [{ id: "trip-one", name: "Zomer 2027" }];
    createTrip.mockImplementation(async ({ name }: { name: string }) => {
      const trip = { id: "new-pot", name };
      state.trips = [...state.trips, trip];
      return trip;
    });
    start();
    fireEvent.click(await screen.findByRole("button", { name: "Nieuwe Knaakie" }));
    fireEvent.change(await screen.findByLabelText("Naam van de Knaakie"), { target: { value: "Festival 2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Maak aan" }));
    await waitFor(() => expect(createTrip).toHaveBeenCalledWith({ name: "Festival 2027", group_size: 1, currency: "EUR" }));
    await waitFor(() => expect(screen.getByTestId("url").textContent).toBe("?tripId=new-pot"));
  });

  it("names the action in the empty state too", async () => {
    state.trips = [];
    start();
    expect(await screen.findByRole("button", { name: "Nieuwe Knaakie" })).toBeInTheDocument();
    expect(screen.queryByText("Nieuwe reis")).not.toBeInTheDocument();
  });

  it("shows the plan limit when the free allowance is full", async () => {
    state.trips = [{ id: "trip-one", name: "Zomer 2027" }];
    createTrip.mockRejectedValue(new Error("trip_limit_reached"));
    start();
    fireEvent.click(await screen.findByRole("button", { name: "Nieuwe Knaakie" }));
    fireEvent.change(await screen.findByLabelText("Naam van de Knaakie"), { target: { value: "Festival 2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Maak aan" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Je hebt nu 3 Knaakies of reizen");
    expect(screen.getByTestId("url").textContent).not.toContain("new-pot");
    expect(screen.getByLabelText("Naam van de Knaakie")).toHaveValue("Festival 2027");
  });
});
