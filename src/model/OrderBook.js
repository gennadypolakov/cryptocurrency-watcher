import {getSymbolOrderBook} from '../api';
import {Order} from './Order';
import {ASK, BID} from '../constants';
import {apiTimeout} from '../config';

export class OrderBook {

  ask;
  bid;
  bestPrice = {ask: null, bid: null};
  best = {ask: null, bid: null};
  isTimeout;
  lastUpdateId;
  bestPriceLastUpdateTime = Date.now();
  lines = {ask: {}, bid: {}};
  name;
  orderStream = [];
  orders;
  series;
  state;
  synced = false;
  ticker;
  U;
  u;
  checkId;

  constructor(ticker) {
    this.ticker = ticker;
    this.name = ticker?.name;
    this.state = ticker?.state;
    this.series = ticker?.series;
    this.ticker?.config?.config$?.subscribe(this.onConfig);
  }

  onConfig = () => {
    this.checkId = Symbol();
    const priceDistance = this.ticker?.config?.priceDistance;
    if (priceDistance) {
      this.checkOrders(ASK, priceDistance);
      this.checkOrders(BID, priceDistance);
    }
  };

  checkOrders = (side, priceDistance) => {
    const bestPrice = this.bestPrice[side];
    const map = this[side];
    if (map && bestPrice) {
      const filter = {
        [ASK]: (p) => p < (bestPrice + bestPrice * priceDistance),
        [BID]: (p) => p > (bestPrice - bestPrice * priceDistance)
      };
      Object.keys(map)
        .map((p) => Number(p))
        .filter(filter[side])
        .forEach((p) => {
          map[p].checkLine(this.checkId);
        });
    }
    const priceLines = this.lines?.[side];
    if (priceLines) {
      Object.keys(priceLines).forEach((price) => {
        priceLines[price].checkLine();
      });
    }
  }

  onOrderBookMessage = (update) => {
    if (update) {
      if (this.synced) {
        this.updateOrderBook(update);
      } else {
        this.orderStream.push(update);
        if (!this.ask && !this.bid) {
          this.setOrderBook();
        }
      }
    }
  };

  checkBestPrice = (side) => {
    const bestPrice = this.bestPrice[side];
    const map = this[side];
    if (map && bestPrice) {
      const filter = {
        [ASK]: (p) => p < bestPrice,
        [BID]: (p) => p > bestPrice
      };
      Object.keys(map)
        .map((p) => Number(p))
        .filter(filter[side])
        .forEach((p) => {
          map[p].remove();
        });
    }
  };

  onBestPrice = (data) => {
    if (data) {
      if (data.a) {
        this.bestPrice.ask = Number(data.a);
      }
      if (data.b) {
        this.bestPrice.bid = Number(data.b);
      }
      const currentTime = Date.now();
      if (currentTime > this.bestPriceLastUpdateTime + 1000 * 5) {
        this.bestPriceLastUpdateTime = currentTime;
        this.checkBestPrice(ASK);
        this.checkBestPrice(BID);
      }
    }
  };

  enableTimeout = () => {
    this.isTimeout = true;
    setTimeout(() => {
      this.isTimeout = false;
    }, (this.ticker?.config?.notificationTimeout || 5) * 1000 * 60);
  };

  setOrderBook = () => {
    if (this.state.apiTimeout) {
      setTimeout(this.setOrderBook, 1000 * 60 * apiTimeout + 100);
    } else {
      this.ask = {};
      this.bid = {};
      getSymbolOrderBook(this.name, 1000)
        .then((data) => {
          if (data) {
            data.asks?.forEach((o) => {
              const price = Number(o[0]);
              const volume = Number(o[1]);
              if (this.ask[price]) {
                this.ask[price].update(volume);
              } else if (volume) {
                this.ask[price] = new Order(ASK, price, volume, this);
              }
            });
            data.bids?.forEach((o) => {
              const price = Number(o[0]);
              const volume = Number(o[1]);
              if (this.bid[price]) {
                this.bid[price].update(volume);
              } else if (volume) {
                this.bid[price] = new Order(BID, price, volume, this);
              }
            });
            this.lastUpdateId = data.lastUpdateId;
            this.syncOrderBook();
          }
        })
        .catch((e) => {
          console.log(e.response);
          this.state.apiTimeout = true;
          this.setOrderBook();
          setTimeout(() => {
            this.state.apiTimeout = false;
          }, 1000 * 60 * apiTimeout);
        });
    }
  };

  remove = () => {
    // this.best?.ask?.remove({next: true});
    // this.best?.bid?.remove({next: true});
  }

  syncOrderBook = () => {
    if (this.orderStream?.length && this.lastUpdateId) {
      const updateId = this.orderStream.findIndex((u) => u.U <= this.lastUpdateId + 1 && u.u >= this.lastUpdateId + 1);
      if (updateId === -1) {
        setTimeout(() => {
          this.syncOrderBook();
        }, 1000);
      } else {
        for(let i = updateId; i < this.orderStream.length; i++) {
          this.updateOrderBook(this.orderStream[i], i === updateId);
        }
        this.synced = true;
        this.orderStream.length = 0;
      }
    }
  };

  updateOrders = (side, update) => {
    const orders = this[side];
    if (orders) {
      update.forEach(([p, v]) => {
        const price = Number(p);
        const volume = Number(v);
        if (price) {
          if (orders[price]) {
            orders[price].update(volume);
          } else if (volume) {
            orders[price] = new Order(side, price, volume, this);
          }
        }
      });
    }
  };

  updateOrderBook = (update, first = false) => {
    if ((this.u && update?.U === this.u + 1) || first) {
      this.u = update?.u;
      if (update?.a?.length) {
        this.updateOrders(ASK, update.a);
      }
      if (update?.b?.length) {
        this.updateOrders(BID, update.b);
      }
    }
  };

}
