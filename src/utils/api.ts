import { context, propagation } from "@opentelemetry/api";

const API_BASE = process.env.PARSERTIME_API_URL;
const BOT_SECRET = process.env.BOT_SECRET;

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string };
type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Injects W3C trace context (traceparent/tracestate) into outgoing headers
 * so Parsertime can continue the same trace.
 */
function injectTraceContext(headers: Record<string, string>) {
  propagation.inject(context.active(), headers);
}

export async function apiGet<T>(
  path: string,
  discordUserId?: string,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${BOT_SECRET}`,
  };
  if (discordUserId) {
    headers["X-Discord-User-Id"] = discordUserId;
  }
  injectTraceContext(headers);

  const res = await fetch(`${API_BASE}${path}`, { headers });
  return res.json() as Promise<ApiResponse<T>>;
}
