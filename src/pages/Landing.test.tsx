import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Landing from "./Landing";
import { GUEST_KNAAKIE_KEY, emptyGuestKnaakie } from "@/features/knaakie-guest/store";

vi.mock("@/features/together/receipt-image", () => ({ prepareReceiptImage: vi.fn().mockResolvedValue("data:image/jpeg;base64,AAAA") }));
vi.mock("@/features/together/receipt-client", () => ({ recognizeReceipt: vi.fn().mockResolvedValue({ description: "Lunch", amount: 24, currency: "EUR", date: "2026-11-07", payerName: null }) }));

afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
const start = () => render(<MemoryRouter><Routes><Route path="/" element={<Landing />} /><Route path="/knaakie" element={<p>Kosten geopend</p>} /><Route path="/signup" element={<p>Aanmelden geopend</p>} /></Routes></MemoryRouter>);

describe("direct receipt entry", () => {
  it("keeps a scanned proposal ephemeral until explicitly saved, then opens the existing costs", async () => {
    start();
    fireEvent.change(screen.getByLabelText("Kies bonfoto op Home"), { target: { files: [new File(["receipt"], "bon.jpg", { type: "image/jpeg" })] } });
    fireEvent.click(await screen.findByRole("button", { name: /Laat AI het uitlezen/ }));
    await screen.findByText("Check en sla op");
    expect(localStorage.getItem(GUEST_KNAAKIE_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));
    await screen.findByText("Kosten geopend");
    const stored = JSON.parse(localStorage.getItem(GUEST_KNAAKIE_KEY) || "{}");
    expect(stored.expenses[0]).toMatchObject({ description: "Lunch", amount: 24, currency: "EUR", paidBy: "me", splitAmong: ["me"] });
    expect(JSON.stringify(stored)).not.toContain("data:image");
    expect(stored.used).toBe(1);
  });

  it("starts manual entry at the amount and saves only after confirmation", async () => {
    start();
    fireEvent.click(screen.getByRole("button", { name: "Vul zelf in" }));
    fireEvent.change(screen.getByLabelText("Bedrag"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: /Volgende/ }));
    fireEvent.click(screen.getByRole("button", { name: "Drinken" }));
    fireEvent.click(screen.getByRole("button", { name: "Alleen voor mij" }));
    expect(localStorage.getItem(GUEST_KNAAKIE_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(GUEST_KNAAKIE_KEY) || "{}").expenses[0].amount).toBe(15));
  });

  it("blocks an eleventh free expense at the direct entry point", async () => {
    localStorage.setItem(GUEST_KNAAKIE_KEY, JSON.stringify({ ...emptyGuestKnaakie(), used: 10 }));
    start();
    fireEvent.click(screen.getByRole("link", { name: /Gratis account maken/ }));
    await screen.findByText("Aanmelden geopend");
    expect(JSON.parse(localStorage.getItem(GUEST_KNAAKIE_KEY) || "{}").used).toBe(10);
  });
});