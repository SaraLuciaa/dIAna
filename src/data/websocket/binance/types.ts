export type BinanceKlineStreamFrame = {
  e: "kline";
  E: number; // event time
  s: string; // symbol
  k: {
    t: number; // kline start time
    T: number; // kline close time
    s: string;
    i: string; // interval
    o: string; // open
    c: string; // close
    h: string; // high
    l: string; // low
    v: string; // base volume
    x: boolean; // is closed
  };
};

