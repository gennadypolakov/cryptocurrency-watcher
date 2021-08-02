import {getFuturesExchangeInfo, getSpotExchangeInfo} from '../api';
import {Ticker} from './Ticker';
import {bannedTimout} from '../config';

export class State {
  tickers;
  tickerNames;
  spot;
  futures;
  priceNearLevel = []; //{name: string, checked: boolean}
  orderDensity = []; //{name: string, checked: boolean}
  banned = {}; //{name: string, checked: boolean}

  dispatch;

  constructor({dispatch, futures, spot, tickers} = {}) {
    this.dispatch = dispatch;
    this.futures = futures;
    this.spot = spot;
    this.tickers = tickers;
    if (!this.spot) {
      this.getSpot();
    }
  }

  getSpot = () => {
    this.spot = {};
    getSpotExchangeInfo()
      .then((data) => {
        if (data?.length) {
          data?.forEach((symbol) => {
            if (symbol.symbol && symbol.quoteAsset === 'USDT' && symbol.status === 'TRADING') {
              this.spot[symbol.symbol] = symbol;
            }
          });
          if (!this.futures) {
            this.getFutures();
          }
        }
      });
  }

  getFutures = () => {
    getFuturesExchangeInfo()
      .then((data) => {
        if (data?.length) {
          this.futures = {};
          this.tickers = {};
          this.tickerNames = [];
          data.forEach((symbol) => {
            if (symbol.symbol && this.spot[symbol.symbol] && symbol.contractType === 'PERPETUAL') {
              this.futures[symbol.symbol] = symbol;
              this.tickerNames.push(symbol.symbol);
            }
          });
          if (this.tickerNames?.length) {
            // this.tickerNames = this.tickerNames.sort().slice(0, 63);
            this.tickerNames = this.tickerNames.sort();
            this.tickerNames.forEach((name) => {
              this.tickers[name] = new Ticker(name, this);
            });
            this.dispatch?.(this);
          }
        }
      });
  }

  remove = (ticker) => {
    this.priceNearLevel = this.priceNearLevel.filter((t) => t.name !== ticker.name);
    this.banned[ticker.name] = ticker;
    this.dispatch?.(this);
    setTimeout(() => {
      delete this.banned[ticker.name];
      this.dispatch?.(this);
    }, bannedTimout * 60 * 1000);
  };

}
