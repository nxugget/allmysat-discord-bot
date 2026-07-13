function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info(...args: unknown[]): void {
    console.log(`[${timestamp()}] [allmysat-discord] [INFO]`, ...args);
  },
  warn(...args: unknown[]): void {
    console.warn(`[${timestamp()}] [allmysat-discord] [WARN]`, ...args);
  },
  error(...args: unknown[]): void {
    console.error(`[${timestamp()}] [allmysat-discord] [ERROR]`, ...args);
  },
};
