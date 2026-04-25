import { emaAlpha } from "./batch.js";

export class RsiIncremental {
  private readonly period: number;
  private prevClose: number | null = null;
  private readonly warmDeltas: { gain: number; loss: number }[] = [];
  private avgGain: number | null = null;
  private avgLoss: number | null = null;

  constructor(period: number) {
    this.period = period;
  }

  /** One new closed bar (close price only). */
  step(close: number): void {
    if (this.prevClose === null) {
      this.prevClose = close;
      return;
    }
    const ch = close - this.prevClose;
    const gain = ch > 0 ? ch : 0;
    const loss = ch < 0 ? -ch : 0;

    if (this.avgGain === null) {
      this.warmDeltas.push({ gain, loss });
      if (this.warmDeltas.length === this.period) {
        let g = 0;
        let l = 0;
        for (const d of this.warmDeltas) {
          g += d.gain;
          l += d.loss;
        }
        this.avgGain = g / this.period;
        this.avgLoss = l / this.period;
      }
    } else {
      const g = this.avgGain!;
      const l = this.avgLoss!;
      this.avgGain = (g * (this.period - 1) + gain) / this.period;
      this.avgLoss = (l * (this.period - 1) + loss) / this.period;
    }
    this.prevClose = close;
  }

  value(): number | null {
    if (this.avgGain === null || this.avgLoss === null) return null;
    if (this.avgLoss === 0) return this.avgGain === 0 ? 50 : 100;
    const rs = this.avgGain / this.avgLoss;
    return 100 - 100 / (1 + rs);
  }
}

export class MacdIncremental {
  private readonly fastPeriod: number;
  private readonly slowPeriod: number;
  private readonly signalPeriod: number;
  private readonly fastBuf: number[] = [];
  private readonly slowBuf: number[] = [];
  private fastEma: number | null = null;
  private slowEma: number | null = null;
  private readonly macdBuf: number[] = [];
  private signalEma: number | null = null;

  constructor(fastPeriod: number, slowPeriod: number, signalPeriod: number) {
    this.fastPeriod = fastPeriod;
    this.slowPeriod = slowPeriod;
    this.signalPeriod = signalPeriod;
  }

  step(close: number): void {
    const kFast = emaAlpha(this.fastPeriod);
    const kSlow = emaAlpha(this.slowPeriod);
    const kSig = emaAlpha(this.signalPeriod);

    if (this.fastEma === null) {
      this.fastBuf.push(close);
      if (this.fastBuf.length === this.fastPeriod) {
        let s = 0;
        for (const x of this.fastBuf) s += x;
        this.fastEma = s / this.fastPeriod;
      }
    } else {
      this.fastEma = close * kFast + this.fastEma * (1 - kFast);
    }

    if (this.slowEma === null) {
      this.slowBuf.push(close);
      if (this.slowBuf.length === this.slowPeriod) {
        let s = 0;
        for (const x of this.slowBuf) s += x;
        this.slowEma = s / this.slowPeriod;
      }
    } else {
      this.slowEma = close * kSlow + this.slowEma * (1 - kSlow);
    }

    if (this.fastEma === null || this.slowEma === null) return;

    const line = this.fastEma - this.slowEma;
    this.macdBuf.push(line);

    if (this.signalEma === null) {
      if (this.macdBuf.length === this.signalPeriod) {
        let s = 0;
        for (const x of this.macdBuf) s += x;
        this.signalEma = s / this.signalPeriod;
      }
    } else {
      this.signalEma = line * kSig + this.signalEma * (1 - kSig);
    }
  }

  snapshot(): { value: number; signal: number; histogram: number } | null {
    if (this.fastEma === null || this.slowEma === null) return null;
    const line = this.fastEma - this.slowEma;
    if (this.signalEma === null) return null;
    return {
      value: line,
      signal: this.signalEma,
      histogram: line - this.signalEma,
    };
  }
}
