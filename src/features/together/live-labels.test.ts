import { describe, expect, it } from "vitest";
import { decisionsLiveLine, knaakieLiveLine, samenHeadline, tasksLiveLine } from "./labels";

const nameOf = (id: string | null | undefined) => ({ me: "Hans", t: "Thomas", l: "Lisa" } as Record<string, string>)[id || ""] || null;
const task = (title: string, assigned: string | null, done = false) => ({ title, status: done ? "done" : "open", progress: done ? 100 : 0, assigned_user_id: assigned });
const fmt = (n: number) => `€${n}`;

describe("tasks live line", () => {
  it("names who handles the single task", () => expect(tasksLiveLine({ tasks: [task("De huurauto", "t")], userId: "me", nameOf })).toBe("Thomas regelt de huurauto."));
  it("asks who picks up an unassigned task", () => expect(tasksLiveLine({ tasks: [task("De koelbox", null)], userId: "me", nameOf })).toBe("Wie pakt de koelbox op?"));
  it("counts open tasks in words", () => expect(tasksLiveLine({ tasks: [task("A", null), task("B", "t")], userId: "me", nameOf })).toBe("Nog twee dingen op het lijstje."));
  it("celebrates when done", () => expect(tasksLiveLine({ tasks: [task("A", null, true)], userId: "me", nameOf })).toBe("Alles geregeld. Lekker!"));
});

describe("decisions live line", () => {
  const open = (votes: string[]) => ({ title: "Waar slapen we?", status: "open", options: [{ label: "het huisje aan zee", votes: votes.map((user_id) => ({ user_id })) }] });
  it("asks me to vote after Lisa", () => expect(decisionsLiveLine({ decisions: [open(["l"])], userId: "me", memberCount: 4, nameOf })).toBe("Lisa heeft een favoriet gekozen. Jij mag nog stemmen!"));
  it("counts missing votes", () => expect(decisionsLiveLine({ decisions: [open(["me"])], userId: "me", memberCount: 3, nameOf })).toBe("Nog twee stemmen en het staat vast."));
  it("announces the winner", () => expect(decisionsLiveLine({ decisions: [{ ...open(["me", "l"]), status: "closed" }], userId: "me", memberCount: 2, nameOf })).toBe("Het wordt het huisje aan zee!"));
});

describe("knaakie live line", () => {
  const exp = [{ amount: 36, currency: "EUR", paid_by_user_id: "t", created_at: "2026-01-01" }];
  it("says what I owe", () => expect(knaakieLiveLine({ expenses: exp, transfers: [{ currency: "EUR", fromUserId: "me", toUserId: "t", cents: 1200 }], userId: "me", nameOf, format: fmt })).toBe("Je moet Thomas nog €12 betalen."));
  it("says what I get back", () => expect(knaakieLiveLine({ expenses: exp, transfers: [{ currency: "EUR", fromUserId: "l", toUserId: "me", cents: 2400 }], userId: "me", nameOf, format: fmt })).toBe("Je krijgt nog €24 terug."));
  it("says quitte", () => expect(knaakieLiveLine({ expenses: exp, transfers: [], userId: "me", nameOf, format: fmt })).toBe("Iedereen heeft betaald. We staan quitte!"));
});

describe("samen headline", () => {
  it("ready to go", () => expect(samenHeadline({ tasksDone: true, decisionsDone: true, waitingForMe: false, hasAnything: true })).toBe("Alles staat klaar voor vertrek."));
});
