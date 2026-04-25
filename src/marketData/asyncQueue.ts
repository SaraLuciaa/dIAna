type Resolver<T> = (value: IteratorResult<T>) => void;

/**
 * Minimal async queue with backpressure via awaiting `next()`.
 * Designed for MVP streaming consumption (single or multiple consumers).
 */
export class AsyncQueue<T> implements AsyncIterable<T> {
  private readonly buffer: T[] = [];
  private readonly waiters: Resolver<T>[] = [];
  private closed = false;
  private closeError: unknown | undefined;

  push(item: T): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value: item, done: false });
      return;
    }
    this.buffer.push(item);
  }

  close(error?: unknown): void {
    if (this.closed) return;
    this.closed = true;
    this.closeError = error;
    while (this.waiters.length > 0) {
      const w = this.waiters.shift();
      w?.({ value: undefined as never, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: async () => {
        if (this.buffer.length > 0) {
          return { value: this.buffer.shift()!, done: false };
        }
        if (this.closed) {
          if (this.closeError) throw this.closeError;
          return { value: undefined as never, done: true };
        }
        return await new Promise<IteratorResult<T>>((resolve) => {
          this.waiters.push(resolve);
        });
      }
    };
  }
}

