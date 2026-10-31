import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskWizard } from "./TaskWizard";
import { DecisionWizard } from "./DecisionWizard";
import { createDecisionWithOptions, createTask } from "./data";

vi.mock("./data", () => ({ createTask: vi.fn().mockResolvedValue({}), createDecisionWithOptions: vi.fn().mockResolvedValue("d") }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const members = [{ userId: "me", displayName: "Sanne", role: "organizer" }, { userId: "piet", displayName: "Piet", role: "member" }] as import("./data").TripMemberView[];

describe("task steps", () => {
  it("suggestion → person → no date → summary, saved only on Taak toevoegen", async () => {
    const onSaved = vi.fn();
    render(<TaskWizard open onOpenChange={vi.fn()} tripId="t" timezone="Europe/Amsterdam" startDate={null} currentUserId="me" isOrganizer members={members} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "Vervoer regelen" }));
    fireEvent.click(screen.getByRole("button", { name: /Piet/ }));
    fireEvent.click(screen.getByRole("button", { name: /Geen datum/ }));
    expect(screen.getByText("Check en sla op")).toBeTruthy();
    expect(createTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Taak toevoegen/ }));
    await waitFor(() => expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ trip_id: "t", title: "Vervoer regelen", assigned_user_id: "piet", due_at: null })));
    expect(onSaved).toHaveBeenCalled();
  });

  it("a traveller who is not the organiser can only pick themselves", () => {
    render(<TaskWizard open onOpenChange={vi.fn()} tripId="t" timezone="Europe/Amsterdam" startDate={null} currentUserId="me" isOrganizer={false} members={members} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Inpakken" }));
    expect(screen.queryByRole("button", { name: /Piet/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Ik doe het/ })).toBeTruthy();
  });
});

describe("choice steps", () => {
  it("needs two options before it can start", async () => {
    render(<DecisionWizard open onOpenChange={vi.fn()} tripId="t" onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Kies het restaurant" }));
    fireEvent.change(screen.getByLabelText("Optie 1"), { target: { value: "Pizza" } });
    expect(screen.getByRole("button", { name: /Volgende/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Optie 2"), { target: { value: "Sushi" } });
    fireEvent.click(screen.getByRole("button", { name: /Volgende/ }));
    fireEvent.click(screen.getByRole("button", { name: /Stemming starten/ }));
    await waitFor(() => expect(createDecisionWithOptions).toHaveBeenCalledWith({ tripId: "t", title: "Kies het restaurant", description: null, options: [{ label: "Pizza" }, { label: "Sushi" }] }));
  });
});
