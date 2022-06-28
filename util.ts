export type LogMessage = (msg: string) => void;

export interface ILogger {
  /** Logs info messages. Usually not displayed to the user. */
  info: LogMessage;
  /** Logs debug messages. Useful for trying to resolve an issue */
  debug: LogMessage;
  /** Logs warning messages. The app can continue running. */
  warn: LogMessage;
  /** Logs error messages */
  error: LogMessage;
}

const prodLogger = () => {
  return {
    info: () => {},
    debug: () => {},
    warn: console.warn,
    error: console.error,
  };
};

const devLogger = () => {
  return {
    info: console.log,
    debug: console.debug,
    warn: console.warn,
    error: console.error,
  };
};

export const getLogger = (): ILogger => {
  if (Deno.env.get("NODE_ENV") === "production") {
    return prodLogger();
  }
  return devLogger();
};
