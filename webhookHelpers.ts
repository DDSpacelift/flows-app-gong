import crypto from "crypto";

/**
 * Verifies the authenticity of a Gong webhook request.
 * Gong typically uses HMAC-SHA256 signatures for webhook verification.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expectedSignature = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

/**
 * Extracts the signature from webhook headers.
 * The exact header name may vary - adjust based on Gong's documentation.
 */
export function extractWebhookSignature(
  headers: Record<string, string>,
): string | null {
  // Common patterns for webhook signatures
  return (
    headers["x-gong-signature"] ||
    headers["x-webhook-signature"] ||
    headers["x-signature"] ||
    null
  );
}
