const API_BASE = process.env.PARSERTIME_API_URL;
const BOT_SECRET = process.env.BOT_SECRET;

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string };
type ApiResponse<T> = ApiSuccess<T> | ApiError;

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

  const res = await fetch(`${API_BASE}${path}`, { headers });
  return res.json() as Promise<ApiResponse<T>>;
}
