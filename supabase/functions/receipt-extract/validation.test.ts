import { receiptAccessAllowed, requestSchema, validReceiptImage } from "./validation.ts";

function assert(condition: boolean) { if (!condition) throw new Error("receipt validation failed"); }
Deno.test("receipt membership is required and archived trips are denied", () => {
  assert(receiptAccessAllowed({ user_id: "a" }, "planning"));
  assert(!receiptAccessAllowed(null, "planning"));
  assert(!receiptAccessAllowed({ user_id: "a" }, "archived"));
});
Deno.test("only inline supported image signatures are accepted", () => {
  assert(validReceiptImage("data:image/jpeg;base64," + btoa("\xff\xd8\xffabc")));
  assert(!validReceiptImage("https://example.test/photo.jpg"));
  assert(!validReceiptImage("data:image/jpeg;base64," + btoa("not a photo")));
  assert(!validReceiptImage("data:image/svg+xml;base64," + btoa("<svg/>")));
});
Deno.test("receipt consent is explicit and identities cannot be sent to AI", () => {
  const body = { tripId: "11111111-1111-4111-8111-111111111111", image: "photo", consent: true };
  assert(requestSchema.safeParse(body).success);
  assert(!requestSchema.safeParse({ ...body, consent: false }).success);
  assert(!requestSchema.safeParse({ ...body, members: ["private"] }).success);
});