import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewTrip from "./NewTrip";

const { createTrip, navigate } = vi.hoisted(() => ({ createTrip: vi.fn(), navigate: vi.fn() }));
vi.mock("@/contexts/TripContext", () => ({ useTrip: () => ({ createTrip }) }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "test-user" } }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));

describe("new trip optional steps", () => {
  beforeEach(() => { vi.clearAllMocks(); createTrip.mockResolvedValue({ id: "saved-trip" }); });

  it("can skip every input step and save without invented dates, destination or group size", async () => {
    render(<NewTrip />);
    for (let step = 0; step < 5; step++) fireEvent.click(screen.getByRole("button", { name: "Sla over" }));
    fireEvent.click(screen.getByRole("button", { name: "Reis starten" }));
    await waitFor(() => expect(createTrip).toHaveBeenCalledWith(expect.objectContaining({ name: "Nieuwe reis", start_date: null, end_date: null, destination_name: undefined, group_size: undefined })));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/trip/saved-trip", { replace: true }));
  });

  it("clears invalid dates when their step is skipped", async () => {
    render(<NewTrip />);
    fireEvent.click(screen.getByRole("button", { name: "Sla over" }));
    fireEvent.click(screen.getByRole("button", { name: "Sla over" }));
    const dates = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dates[0], { target: { value: "2027-08-10" } });
    fireEvent.change(dates[1], { target: { value: "2027-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Sla over" }));
    fireEvent.click(screen.getByRole("button", { name: "Sla over" }));
    fireEvent.click(screen.getByRole("button", { name: "Sla over" }));
    fireEvent.click(screen.getByRole("button", { name: "Reis starten" }));
    await waitFor(() => expect(createTrip).toHaveBeenCalledWith(expect.objectContaining({ start_date: null, end_date: null })));
  });
});