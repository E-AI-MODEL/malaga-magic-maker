import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpenseSheet } from "./ExpenseSheet";
import { createExpenseWithSplits } from "./data";

vi.mock("./data", () => ({ createExpenseWithSplits: vi.fn().mockResolvedValue("expense"), updateExpenseWithSplits: vi.fn() }));
vi.mock("./ReceiptInput", () => ({ ReceiptInput: ({ onProposal }: { onProposal: (p: unknown) => void }) => <button type="button" onClick={() => onProposal({ description: "Restaurant", amount: 43.5, currency: "USD", date: null, payerName: "Piet" })}>Test proposal</button> }));
const props = { open: true, onOpenChange: vi.fn(), tripId: "trip-a", tripCurrency: "EUR", currentUserId: "me", members: [{ userId: "me", displayName: "Sanne", role: "member" }, { userId: "piet", displayName: "Piet", role: "member" }] as import("./data").TripMemberView[], onSaved: vi.fn() };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("explicit receipt saving", () => {
  it("does not save a proposal until reviewed and explicitly submitted with corrections", async () => {
    render(<ExpenseSheet {...props} />);
    fireEvent.click(screen.getByText("Test proposal"));
    expect(createExpenseWithSplits).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Wie betaalde?")).toHaveValue("piet");
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));
    expect(createExpenseWithSplits).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Bedrag *"), { target: { value: "50" } });
    fireEvent.click(screen.getByLabelText("Ik heb bedrag, valuta, betaler en verdeling gecontroleerd."));
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));
    // Standaard wordt een nieuw bonnetje gelijk verdeeld over alle reizigers.
    await waitFor(() => expect(createExpenseWithSplits).toHaveBeenCalledWith("trip-a", { description: "Restaurant", amount: 50, currency: "USD", paidByUserId: "piet", splits: [{ user_id: "me", amount: 25 }, { user_id: "piet", amount: 25 }] }));
    expect(props.onSaved).toHaveBeenCalled();
  });
  it("discards proposed fields when closed without saving", () => {
    const view = render(<ExpenseSheet {...props} />);
    fireEvent.click(screen.getByText("Test proposal"));
    view.rerender(<ExpenseSheet {...props} open={false} />);
    view.rerender(<ExpenseSheet {...props} />);
    expect(screen.getByLabelText("Bedrag *")).toHaveValue(null);
    expect(screen.getByLabelText("Waarvoor? *")).toHaveValue("");
    expect(createExpenseWithSplits).not.toHaveBeenCalled();
  });
});