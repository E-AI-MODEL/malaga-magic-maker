import { describe, expect, it } from "vitest";
import { sanitizeClientErrorMessage } from "./clientErrors";

describe("client error sanitization", () => {
  it("redacts bearer credentials and JWT-like values", () => {
    const value = sanitizeClientErrorMessage("Bearer abc.def.ghi token eyJabc123456789.eyJdef123456789.signature123456789");
    expect(value).not.toContain("Bearer abc.def.ghi");
    expect(value).not.toContain("eyJabc123456789");
  });

  it("removes full URLs so invite tokens and query values are not reported", () => {
    const value = sanitizeClientErrorMessage("Failed at https://example.test/join/secret-token?code=123");
    expect(value).toContain("[url]");
    expect(value).not.toContain("secret-token");
    expect(value).not.toContain("code=123");
  });

  it("bounds reported messages", () => {
    expect(sanitizeClientErrorMessage("x".repeat(1000))).toHaveLength(500);
  });
});
