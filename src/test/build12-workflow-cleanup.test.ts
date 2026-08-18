import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

describe("BUILD 12 workflow cleanup", () => {
  it("does not leave temporary build12 workflow helpers in the repository", () => {
    const workflows = readdirSync(resolve(process.cwd(), ".github/workflows"));
    expect(workflows.filter((name) => name.startsWith("build12-"))).toEqual([]);
    expect(workflows).toContain("quality.yml");
    expect(workflows).toContain("runtime-dependency-audit.yml");
  });
});
