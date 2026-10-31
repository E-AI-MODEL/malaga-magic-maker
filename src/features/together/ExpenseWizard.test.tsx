import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpenseWizard, stepAfterProposal, wizardSteps } from "./ExpenseWizard";

vi.mock("./receipt-image", () => ({ prepareReceiptImage: vi.fn().mockResolvedValue("data:image/jpeg;base64,AAAA") }));
vi.mock("./receipt-client", () => ({ recognizeReceipt: vi.fn().mockResolvedValue({ description: "Pizzeria Roma", amount: 24, currency: "EUR", date: "2026-10-12", payerName: null }) }));

const people = [{ id: "me", name: "Sanne" }, { id: "piet", name: "Piet" }];
const base = { open: true, onOpenChange: vi.fn(), tripId: "trip-a", selfId: "me", defaultCurrency: "EUR" };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("bonnetje steps", () => {
  it("skips who-paid and sharing when you are alone", () => {
    expect(wizardSteps(1, false)).toEqual(["start", "amount", "what", "summary"]);
    expect(wizardSteps(2, false)).toEqual(["start", "amount", "what", "payer", "split", "summary"]);
  });

  it("jumps to the summary only when amount and description were read", () => {
    expect(stepAfterProposal(24, "Pizza")).toBe("summary");
    expect(stepAfterProposal(null, "Pizza")).toBe("amount");
    expect(stepAfterProposal(15, null)).toBe("what");
  });

  it("walks through by hand, auto-advancing after each choice, and saves an equal split", async () => {
    const onSave = vi.fn();
    render(<ExpenseWizard {...base} people={people} onSave={onSave} />);
    fireEvent.click(screen.getByText("Zelf invullen"));
    fireEvent.change(screen.getByLabelText("Bedrag"), { target: { value: "30,50" } });
    fireEvent.click(screen.getByRole("button", { name: /Volgende/ }));
    fireEvent.click(screen.getByRole("button", { name: "Eten" }));
    fireEvent.click(screen.getByRole("button", { name: /Piet/ }));
    fireEvent.click(screen.getByRole("button", { name: /Iedereen gelijk/ }));
    expect(screen.getByText("Klopt dit?")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ description: "Eten", amount: 30.5, currency: "EUR", paidBy: "piet", splitAmong: ["me", "piet"] }));
  });

  it("reads a photo and goes straight to the summary without saving by itself", async () => {
    const onSave = vi.fn();
    const { container } = render(<ExpenseWizard {...base} people={people} onSave={onSave} />);
    const input = container.ownerDocument.querySelector('input[aria-label="Kies bonfoto"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "bon.jpg", { type: "image/jpeg" })] } });
    fireEvent.click(await screen.findByRole("button", { name: /Laat AI het uitlezen/ }));
    expect(await screen.findByText("Klopt dit?")).toBeTruthy();
    expect(screen.getByText("Pizzeria Roma")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
});
