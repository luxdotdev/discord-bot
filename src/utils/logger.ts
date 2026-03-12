type LogLevel = "info" | "error";

const COMMIT_HASH = process.env.RAILWAY_GIT_COMMIT_SHA ?? "unknown";
const SERVICE = "parsertime-bot";
const ENVIRONMENT = process.env.RAILWAY_ENVIRONMENT ?? "development";

function emit(level: LogLevel, event: Record<string, unknown>) {
  const entry = {
    level,
    service: SERVICE,
    environment: ENVIRONMENT,
    commit_hash: COMMIT_HASH,
    timestamp: new Date().toISOString(),
    ...event,
  };

  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info(event: Record<string, unknown>) {
    emit("info", event);
  },
  error(event: Record<string, unknown>) {
    emit("error", event);
  },
};
