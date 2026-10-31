import { describe, expect, it } from "vitest";
import {
  GUEST_SELF_ID,
  addGuestExpense,
  addGuestPerson,
  emptyGuestKnaakie,
  guestImportRows,
  guestTransfers,
  guestUsesLeft,
  parseGuestKnaakie,
  removeGuestExpense,
  removeGuestPerson,
} from "./store";

const expense = (paidBy = GUEST_SELF_ID, splitAmong = [GUEST_SELF_ID]) => ({ description: "Pizza", amount: 30, currency: "EUR", paidBy, splitAmong });

describe("Knaakie without an account", () => {
  it("allows exactly 10 free expenses", () => {
    let state = emptyGuestKnaakie();
    for (let i = 0; i < 10; i += 1) state = addGuestExpense(state, expense());
    expect(guestUsesLeft(state)).toBe(0);
    expect(() => addGuestExpense(state, expense())).toThrow("guest_limit_reached");
  });

  it("does not give a free use back when an expense is deleted", () => {
    let state = addGuestExpense(emptyGuestKnaakie(), expense());
    state = removeGuestExpense(state, state.expenses[0].id);
    expect(guestUsesLeft(state)).toBe(9);
  });

  it("keeps the count when stored data is tampered to a lower number", () => {
    let state = emptyGuestKnaakie();
    for (let i = 0; i < 3; i += 1) state = addGuestExpense(state, expense());
    const parsed = parseGuestKnaakie(JSON.stringify({ ...state, used: 0 }));
    expect(guestUsesLeft(parsed)).toBe(7);
  });

  it("shares costs with added people and shows who pays whom", () => {
    let state = addGuestPerson(emptyGuestKnaakie(), "Sanne");
    const sanne = state.people[1].id;
    state = addGuestExpense(state, { ...expense(GUEST_SELF_ID, [GUEST_SELF_ID, sanne]), amount: 43.5 });
    expect(guestTransfers(state)).toEqual([{ fromUserId: sanne, toUserId: GUEST_SELF_ID, cents: 2175, currency: "EUR" }]);
  });

  it("does not remove someone who is still in an expense", () => {
    let state = addGuestPerson(emptyGuestKnaakie(), "Joris");
    const joris = state.people[1].id;
    state = addGuestExpense(state, expense(joris, [GUEST_SELF_ID, joris]));
    expect(removeGuestPerson(state, joris).people).toHaveLength(2);
  });

  it("moves expenses over oldest first, keeping other names readable", () => {
    let state = addGuestPerson(emptyGuestKnaakie(), "Sanne");
    const sanne = state.people[1].id;
    state = addGuestExpense(state, { ...expense(), description: "Bier" });
    state = addGuestExpense(state, { ...expense(sanne, [GUEST_SELF_ID, sanne]), description: "Taxi" });
    expect(guestImportRows(state).map((row) => row.description)).toEqual(["Bier", "Taxi (betaald door Sanne, gedeeld met Sanne)"]);
  });
});
