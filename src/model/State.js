import {getFuturesExchangeInfo, getSpotExchangeInfo} from '../api';
import {Ticker} from './Ticker';
import {bannedTimout, checkedTimout, minLevelAge, minOrderPercentage, orderTimeout, priceDistance, removeOrderPercentage, removeTimeout} from '../config';
import {Settings} from './Settings';

export class State {
  tickers;
  tickerNames;
  spot;
  futures;
  priceNearLevel = []; //{name: string, checked: boolean}
  orderDensity = []; //{name: string, checked: boolean}
  banned = {}; //{name: string, checked: boolean}
  config;

  dispatch;

  constructor({dispatch, futures, spot, tickers} = {}) {
    this.dispatch = dispatch;
    this.futures = futures;
    this.spot = spot;
    this.tickers = tickers;
    if (!this.config) {
      this.config = new Settings(this);
    }
    if (!this.spot) {
      this.getSpot();
    }
  }

  getConfig = () => {
    let config = localStorage.getItem('config')
    if (config) return JSON.parse(config);
    else return {
      minOrderPercentage,
      priceDistance,
      checkedTimout,
      bannedTimout,
      orderTimeout,
      minLevelAge,
      removeTimeout,
      removeOrderPercentage
    }
  };

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
          if (!this.config.tickers) {
            this.config.tickers = {};
          }
          data.forEach((symbol) => {
            if (symbol.symbol && this.spot[symbol.symbol] && symbol.contractType === 'PERPETUAL') {
              this.futures[symbol.symbol] = symbol;
              this.tickerNames.push(symbol.symbol);
              if (!this.config.tickers[symbol.symbol]) {
                this.config.tickers[symbol.symbol] = {
                  name: symbol.symbol,
                  isActive: false,
                  isNew: true
                }
              }
            }
          });
          if (this.tickerNames?.length) {
            if (this.config.tickers) {
              Object.keys(this.config.tickers)
                .filter((name) => !this.config.tickers[name].isNew)
                .forEach((name) => {
                  if (!this.futures[name]) {
                    delete this.config.tickers[name];
                    localStorage.removeItem(name);
                  }
                });
              this.config.save();
            }
            this.tickerNames = Object.keys(this.config.tickers)
              .filter((name) => this.config.tickers[name].isActive).sort();
            this.tickerNames.forEach((name) => {
              this.tickers[name] = new Ticker(name, this);
            });
            console.log(this.tickerNames);
            this.dispatch?.(this);
          }
        }
      });
  }

  updateTickers = () => {
    this.tickerNames = Object.keys(this.config.tickers)
      .filter((name) => {
        const isActive = this.config.tickers[name].isActive
        if (isActive) {
          if (!this.tickers[name]) {
            this.tickers[name] = new Ticker(name, this);
          }
        } else if (this.tickers[name]) {
          delete this.tickers[name];
        }
        return isActive;
      }).sort();
    this.dispatch?.(this);
  };

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
