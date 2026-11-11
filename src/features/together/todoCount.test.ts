import { describe, expect, it } from "vitest";
import { todoCount } from "./TripTodoPanel";

const vote = (user_id: string) => ({ user_id });
describe("todoCount", () => {
  it("removes a finalized stay from Te doen even without my vote", () => {
    expect(todoCount([], [{ status: "open", options: [{ votes: [] }] }], "me")).toBe(1);
    expect(todoCount([], [{ status: "closed", options: [{ votes: [] }] }], "me")).toBe(0);
  });
  it("counts open tasks and open decisions without my vote, once each", () => {
    const tasks = [{ status: "open", progress: 0 }, { status: "done", progress: 100 }, { status: "open", progress: 100 }];
    const decisions = [
      { status: "open", options: [{ votes: [vote("other")] }, { votes: [] }] },
      { status: "open", options: [{ votes: [vote("me"), vote("other")] }] },
      { status: "closed", options: [{ votes: [] }] },
    ];
    expect(todoCount(tasks, decisions, "me")).toBe(2);
  });
});
