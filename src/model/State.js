import {getFuturesExchangeInfo, getSpotExchangeInfo} from '../api';
import {Subject} from 'rxjs';
import {set} from 'lodash';

import {Ticker} from './Ticker';
import {Settings} from './Settings';
import {Level} from './Level';
import {Order} from './Order';
import {apiTimeout} from '../config';
import {notification} from 'antd';

export class State {
  apiTimeout;
  banned = {}; //{name: string, checked: boolean}
  config;
  events = {};
  eventTickers;
  events$ = new Subject();
  futures;
  priceNearLevel = []; //{name: string, checked: boolean}
  spot;
  tickerNames;
  tickers;
  counter = 0;
  loading = {};
  firstStart = false;
  favoritesHeight = 0;

  clientWidth;
  width;

  dispatch;

  _favorites;

  get favorites() {
    if (!this._favorites) {
      this._favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    }
    return this._favorites;
  }

  set favorites(v) {
    this._favorites = v || [];
    localStorage.setItem('favorites', JSON.stringify(this._favorites));
  }

  constructor(dispatch) {
    this.dispatch = dispatch;
  }

  getWidth = () => {
    let count = this.config?.columnCount;
    if (this.clientWidth < 600) {
      this.width = this.clientWidth - 12;
    } else if (count) {
      if ((this.clientWidth - 12 * count) / count < 400) {
        while((this.clientWidth - 12 * count) / count < 400 && count > 1) {
          count--;
        }
      }
      this.width = (this.clientWidth - 12 * count) / count;
    }
    return this.width;
  };

  init = () => {
    if (this.clientWidth) {
      if (!this.config) {
        this.config = new Settings(this);
        this.getWidth();
        if (!this.spot) {
          this.getSpot();
        }
        this.setNotification();
        this.events$.subscribe(this.onEvent);
      }
    }
  };

  setWidth = (width) => {
    if (width) {
      this.clientWidth = width;
      this.init();
      this.dispatch?.(this);
    }
  };

  onEvent = (event) => {
    if (event && event.price && event.ticker?.name) {
      if (
        event instanceof Level &&
        !this.events[event.ticker.name]?.level?.[event.price]
      ) {
        set(this.events, [event.ticker.name, 'level', event.price], event);
        this.dispatch?.(this);
      } else if (
        event instanceof Order &&
        !this.events[event.ticker.name]?.order?.[event.price]
      ) {
        set(this.events, [event.ticker.name, 'order', event.price], event);
        this.dispatch?.(this);
      }
    }
  }

  removeEvent = (name, price, type) => {
    if (name && price && type && this.events[name]?.[type]?.[price]) {
      delete this.events[name][type][price];
      const levels = this.events[name].level;
      const orders = this.events[name].order;
      const levelsCount = levels ? Object.keys(levels).length : 0;
      const ordersCount = orders ? Object.keys(orders).length : 0;
      if (!levelsCount && !ordersCount) {
        delete this.events[name];
        this.dispatch(this);
      }
    }
  };

  onError = (callback, message = 'Ошибка загрузки данных') => {
    if (!this.tickerNames) this.tickerNames = [];
    this.apiTimeout = true;
    if (message) {
      notification.error({message})
    }
    if (callback) {
      setTimeout(() => {
        this.apiTimeout = false;
        callback();
      }, 1000 * 60 * apiTimeout);
    }
    this.dispatch(this);
  };

  getSpot = () => {
    if (this.apiTimeout) {
      this.onError(this.getSpot, '');
    } else {
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
        })
        .catch(() => {
          this.onError(this.getSpot);
        });
    }
  }

  getFutures = () => {
    if (this.apiTimeout) {
      this.onError(this.getFutures, '');
    } else {
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
                const savedTickersNames = Object.keys(this.config.tickers)
                  .filter((name) => !this.config.tickers[name].isNew);
                if (!savedTickersNames.length) {
                  this.firstStart = true;
                }
                savedTickersNames.forEach((name) => {
                  if (!this.futures[name]) {
                    delete this.config.tickers[name];
                    localStorage.removeItem(name);
                  }
                });
                Object.keys(this.config.tickers)
                  .forEach((name) => {
                    this.config.tickers[name].isNew = false;
                  });
                this.config.save();
              }
              const tickerNames = Object.keys(this.config.tickers);
              if (this.firstStart) {
                this.tickerNames = tickerNames
                  .sort()
                  .slice(0, 6);
                this.tickerNames.forEach((name) => {
                  this.config.tickers[name].isActive = true;
                });
                this.config.save();
              } else {
                this.tickerNames = tickerNames
                  .filter((name) => this.config.tickers[name].isActive)
                  .sort();
              }
              this.loading = {};
              if (this.tickerNames.length) {
                this.tickerNames.forEach((name) => {
                  this.loading[name] = true;
                  setTimeout(() => {
                    this.tickers[name] = new Ticker(name, this);
                    delete this.loading[name];
                    if (!Object.keys(this.loading).length) {
                      this.dispatch?.(this);
                    }
                  });
                });
              } else {
                this.dispatch?.(this);
              }
            } else {
              this.dispatch?.(this);
            }
          }
        })
        .catch(() => {
          this.onError(this.getFutures);
        });
    }
  }

  updateTickers = () => {
    this.tickerNames = Object.keys(this.config.tickers)
      .filter((name) => {
        const isActive = this.config.tickers[name].isActive
        this.loading[name] = true;
        setTimeout(() => {
          if (isActive) {
            if (!this.tickers[name]) {
              this.tickers[name] = new Ticker(name, this);
            }
          } else if (this.tickers[name]) {
            this.tickers[name].disable(false);
            delete this.events[name];
            delete this.tickers[name];
          }
          delete this.loading[name];
          if (!Object.keys(this.loading).length) {
            this.dispatch?.(this);
          }
        }, 0);
        return isActive;
      }).sort();
  };

  setNotification = () => {
    // Let's check if the browser supports notifications
    if (Notification) {
      // alert("This browser support desktop notification");
    }

    // Let's check whether notification permissions have already been granted
    // else if (Notification.permission === "granted") {
    //   // If it's okay let's create a notification
    //   var notification = new Notification("Hi there!");
    // }
    //
    // // Otherwise, we need to ask the user for permission
    // else if (Notification.permission !== "denied") {
    //   Notification.requestPermission().then(function (permission) {
    //     // If the user accepts, let's create a notification
    //     if (permission === "granted") {
    //       var notification = new Notification("Hi there!");
    //     }
    //   });
    // }

    // At last, if the user has denied notifications, and you
    // want to be respectful there is no need to bother them any more.
  }

}
