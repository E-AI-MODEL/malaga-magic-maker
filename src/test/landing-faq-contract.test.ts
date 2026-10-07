import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Landing FAQ contract", () => {
  const landing = source("src/pages/Landing.tsx");

  it("does not carry the trust-point block or the standalone document-security question", () => {
    expect(landing).not.toContain("Waarom Vakansie?");
    expect(landing).not.toContain("TRUST_POINTS");
    expect(landing).not.toContain("Je data blijft van jou");
    expect(landing).not.toContain("Documenten privé per reis");
    expect(landing).not.toContain("Zijn mijn documenten veilig?");
  });

  it("renders the FAQ as a collapsible accordion with nine richer answers", () => {
    expect(landing).toContain('from "@/components/ui/accordion"');
    expect(landing).toContain("<AccordionTrigger");
    expect(landing).toContain("<AccordionContent");
    expect(landing).toContain("collapsible");
    const questions = landing.match(/^\s{4}q: "/gm) || [];
    expect(questions).toHaveLength(9);
  });
});
