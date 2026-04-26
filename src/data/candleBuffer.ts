export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Buffer circular simple para velas.
 * MVP: se usa como base para calcular indicadores al cierre de vela.
 */
export class CandleBuffer {
  private readonly max: number;
  private readonly items: Candle[] = [];

  constructor(max = 300) {
    this.max = Math.max(1, Math.floor(max));
  }

  push(c: Candle): void {
    this.items.push(c);
    if (this.items.length > this.max) {
      this.items.splice(0, this.items.length - this.max);
    }
  }

  toArray(): Candle[] {
    return [...this.items];
  }

  last(): Candle | undefined {
    return this.items[this.items.length - 1];
  }

  size(): number {
    return this.items.length;
  }
}

