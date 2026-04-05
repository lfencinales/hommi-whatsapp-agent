type LogLevel = "debug" | "info" | "warn" | "error";

function format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
}

function shouldLogDebug(): boolean {
  return process.env["NODE_ENV"] !== "production";
}

export function createLogger(scope: string) {
  const prefix = `[${scope}]`;

  return {
    debug(message: string, meta?: Record<string, unknown>) {
      if (!shouldLogDebug()) return;
      console.debug(format("debug", `${prefix} ${message}`, meta));
    },
    info(message: string, meta?: Record<string, unknown>) {
      console.info(format("info", `${prefix} ${message}`, meta));
    },
    warn(message: string, meta?: Record<string, unknown>) {
      console.warn(format("warn", `${prefix} ${message}`, meta));
    },
    error(message: string, meta?: Record<string, unknown>) {
      console.error(format("error", `${prefix} ${message}`, meta));
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
