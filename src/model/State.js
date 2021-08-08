import {getFuturesExchangeInfo, getSpotExchangeInfo} from '../api';
import {BehaviorSubject, Subject} from 'rxjs';
import {set} from 'lodash';

import {Ticker} from './Ticker';
import {Settings} from './Settings';
import {Level} from './Level';
import {Order} from './Order';
import {apiTimeout} from '../config';

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
  // orderSubscribers = 0;
  // priceSubscribers = 0;
  // chartSubscribers = 0;

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
    this.setNotification();
    this.events$.subscribe(this.onEvent);
    // setInterval(() => {
    //   console.log('priceSubscribers', this.priceSubscribers);
    //   console.log('orderSubscribers', this.orderSubscribers);
    //   console.log('chartSubscribers', this.chartSubscribers);
    // }, 2000);
  }

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

  getSpot = () => {
    if (this.apiTimeout) {
      setTimeout(this.getSpot, 1000 * 60 * apiTimeout + 100);
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
        .catch((e) => {
          console.log(e.response);
          this.apiTimeout = true;
          this.getSpot();
          setTimeout(() => {
            this.apiTimeout = false;
          }, 1000 * 60 * apiTimeout);
        });
    }
  }

  getFutures = () => {
    if (this.apiTimeout) {
      setTimeout(this.getFutures, 1000 * 60 * apiTimeout + 100);
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
                Object.keys(this.config.tickers)
                  .filter((name) => !this.config.tickers[name].isNew)
                  .forEach((name) => {
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
              this.tickerNames = Object.keys(this.config.tickers)
                .filter((name) => this.config.tickers[name].isActive).sort();
              this.tickerNames.forEach((name) => {
                this.tickers[name] = new Ticker(name, this);
              });
              this.dispatch?.(this);
            }
          }
        })
        .catch((e) => {
          console.log(e.response);
          this.apiTimeout = true;
          this.getFutures();
          setTimeout(() => {
            this.apiTimeout = false;
          }, 1000 * 60 * apiTimeout);
        });
    }
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
          this.tickers[name].disable(false);
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
    if (this.config?.notificationTimeout) {
      setTimeout(() => {
        delete this.banned[ticker.name];
        this.dispatch?.(this);
      }, this.config.notificationTimeout * 60 * 1000);
    }
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
