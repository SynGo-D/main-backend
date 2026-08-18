export interface Logger {
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
}

export function createLogger(svc: string): Logger {
  const emit = (level: "info" | "warn" | "error") =>
    (msg: string, extra?: Record<string, unknown>) => {
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        level,
        svc,
        msg,
        ...(extra ?? {}),
      });
      // eslint-disable-next-line no-console
      (level === "error" ? console.error : console.log)(line);
    };
  return { info: emit("info"), warn: emit("warn"), error: emit("error") };
}
