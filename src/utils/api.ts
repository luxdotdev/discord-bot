import { getApiKeyForGuild } from "./key-store.ts";

const API_BASE = process.env.PARSERTIME_API_URL;

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string };
type ApiResponse<T> = ApiSuccess<T> | ApiError;

export async function apiGet<T>(
  guildId: string,
  path: string,
  discordUserId?: string
): Promise<ApiResponse<T>> {
  const apiKey = getApiKeyForGuild(guildId);
  if (!apiKey) {
    return {
      success: false,
      error:
        "This server hasn't been set up yet. Ask a team owner to run `/setup`.",
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  if (discordUserId) {
    headers["X-Discord-User-Id"] = discordUserId;
  }

  const res = await fetch(`${API_BASE}${path}`, { headers });
  return res.json() as Promise<ApiResponse<T>>;
}

export async function apiPost<T>(
  guildId: string,
  path: string,
  body: unknown,
  discordUserId?: string
): Promise<ApiResponse<T>> {
  const apiKey = getApiKeyForGuild(guildId);
  if (!apiKey) {
    return {
      success: false,
      error:
        "This server hasn't been set up yet. Ask a team owner to run `/setup`.",
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (discordUserId) {
    headers["X-Discord-User-Id"] = discordUserId;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json() as Promise<ApiResponse<T>>;
}

export async function apiDelete<T>(
  guildId: string,
  path: string,
  body: unknown
): Promise<ApiResponse<T>> {
  const apiKey = getApiKeyForGuild(guildId);
  if (!apiKey) {
    return {
      success: false,
      error:
        "This server hasn't been set up yet. Ask a team owner to run `/setup`.",
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify(body),
  });
  return res.json() as Promise<ApiResponse<T>>;
}
