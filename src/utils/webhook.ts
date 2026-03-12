import { createHmac } from "crypto";

export function verifySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return signature === expected;
}
