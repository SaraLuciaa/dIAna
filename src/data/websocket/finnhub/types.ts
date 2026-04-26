export type FinnhubSubscribeMessage = {
  type: "subscribe" | "unsubscribe";
  symbol: string;
};

export type FinnhubTrade = {
  /** price */
  p: number;
  /** symbol */
  s: string;
  /** timestamp (ms since epoch) */
  t: number;
  /** volume */
  v: number;
  /** trade conditions */
  c?: string[];
};

export type FinnhubTradeFrame = {
  type: "trade";
  data: FinnhubTrade[];
};

export type FinnhubPingFrame = {
  type: "ping";
};

export type FinnhubErrorFrame = {
  type: "error";
  msg?: string;
  message?: string;
  code?: number | string;
};

export type FinnhubWsFrame =
  | FinnhubTradeFrame
  | FinnhubPingFrame
  | FinnhubErrorFrame
  | { type: string; [k: string]: unknown };

