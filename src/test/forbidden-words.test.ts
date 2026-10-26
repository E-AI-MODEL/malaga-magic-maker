import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["src/pages", "src/features", "src/components"];
const banned = [/draaiboek/i, /nog regelen/i, /wat telt nu/i, /afvalrace/i, /van \$\{[^}]+\} geregeld/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) && !name.includes(".test.") ? [path] : [];
  });
}

describe("customer copy", () => {
  it("contains none of the rejected phrases", () => {
    const hits = roots.flatMap(files).flatMap((file) => {
      const text = readFileSync(file, "utf8");
      return banned.filter((re) => re.test(text)).map((re) => `${file}: ${re}`);
    });
    expect(hits).toEqual([]);
  });
});
