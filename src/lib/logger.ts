type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  const base = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
  if (entry.data && Object.keys(entry.data).length > 0) {
    return `${base} ${JSON.stringify(entry.data)}`;
  }
  return base;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
}

export const logger = {
  info(message: string, data?: Record<string, unknown>) {
    const entry = createLogEntry("info", message, data);
    if (process.env.NODE_ENV === "production") {
      console.info(JSON.stringify(entry));
    } else {
      console.info(formatLog(entry));
    }
  },

  warn(message: string, data?: Record<string, unknown>) {
    const entry = createLogEntry("warn", message, data);
    if (process.env.NODE_ENV === "production") {
      console.warn(JSON.stringify(entry));
    } else {
      console.warn(formatLog(entry));
    }
  },

  error(message: string, data?: Record<string, unknown>) {
    const entry = createLogEntry("error", message, data);
    if (process.env.NODE_ENV === "production") {
      console.error(JSON.stringify(entry));
    } else {
      console.error(formatLog(entry));
    }
  },

  debug(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      const entry = createLogEntry("debug", message, data);
      console.debug(formatLog(entry));
    }
  },
};
