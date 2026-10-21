import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

vi.mock("@/contexts/TripContext", () => ({
  useTrip: () => ({ activeTrip: { id: "trip-one" } }),
}));

function CurrentLocation() {
  const { pathname, search } = useLocation();
  return <output data-testid="destination">{pathname}{search}</output>;
}

afterEach(cleanup);

describe("Knaakie footer shortcut", () => {
  it.each(["/trip/trip-one", "/trip/trip-one/reis", "/trip/trip-one/samen?section=tasks"])(
    "opens the current trip's existing costs from %s",
    (start) => {
      render(<MemoryRouter initialEntries={[start]}><BottomNav /><CurrentLocation /></MemoryRouter>);
      fireEvent.click(screen.getByRole("link", { name: "Knaakie" }));
      expect(screen.getByTestId("destination").textContent).toBe("/trip/trip-one/samen?section=expenses");
      expect(screen.getByRole("link", { name: "Knaakie" }).getAttribute("aria-current")).toBe("page");
      expect(screen.getByRole("link", { name: "Samen" }).getAttribute("aria-current")).not.toBe("page");
    },
  );
});