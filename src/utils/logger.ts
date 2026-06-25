function timestamp(): string {
  return new Date().toISOString();
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${timestamp()}] ${message}${suffix}`);
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.error(`[${timestamp()}] ${message}${suffix}`);
}

export async function withToolLog<T>(
  tool: string,
  args: Record<string, unknown> | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  logInfo(`tool call: ${tool}`, args);

  try {
    const result = await fn();
    logInfo(`tool done: ${tool}`, { ms: Date.now() - start });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`tool failed: ${tool}`, { ms: Date.now() - start, error: message });
    throw error;
  }
}
