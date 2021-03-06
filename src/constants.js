export const ASK = 'ask';
export const BID = 'bid';
export const HIGH = 'high';
export const LOW = 'low';
export const M5 = '5m';
export const H1 = '1h';
export const H4 = '4h';
export const D1 = '1d';
export const LEVEL_COLOR = '#9912be';
export const CROSSED_LEVEL_COLOR = '#979797';
export const ORDER_COLOR = '#0b4fff';
export const barPrices = ['open', 'high', 'low', 'close'];
export const btcusdt = 'BTCUSDT';
export const blinkChartBorder = 'blinkChartBorder';
export const EN = 'en';
export const RU = 'ru';
export const intervalDuration = { // one interval duration in ms
  [M5]: 300000, // 5 * 60 * 1000
  [H1]: 3600000, // 60 * 60 * 1000
  [H4]: 14400000, // 60 * 60 * 4 * 1000
  [D1]: 86400000 // 60 * 60 * 24 * 1000
};
