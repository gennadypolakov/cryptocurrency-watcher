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
    this.ticker?.config?.config$?.subscribe(this.checkOrders);
  }

  checkOrders = () => {
    this.checkId = Symbol();
    const priceDistance = this.ticker?.config?.priceDistance || 0;
    let bestPrice = this.bestPrice.ask;
    let endPrice = bestPrice + bestPrice * priceDistance;
    if (this.ask) {
      const prices = Object.keys(this.ask).map((p) => Number(p)).filter((p) => p < endPrice);
      prices.forEach((p) => {
        this.ask[p].checkLine(this.checkId);
      });
    }
    bestPrice = this.bestPrice.bid;
    endPrice = bestPrice - bestPrice * priceDistance;
    if (this.bid) {
      const prices = Object.keys(this.bid).map((p) => Number(p)).filter((p) => p > endPrice);
      prices.forEach((p) => {
        this.bid[p].checkLine(this.checkId);
      });
    }
    Object.keys(this.lines.ask).forEach((price) => {
      this.lines.ask[price].checkLine();
    });
    Object.keys(this.lines.bid).forEach((price) => {
      this.lines.bid[price].checkLine();
    });
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

  onBestPrice = (data) => {
    if (data) {
      if (data.a) {
        this.bestPrice.ask = Number(data.a);
      }
      if (data.b) {
        this.bestPrice.bid = Number(data.b);
      }
      const currentTime = Date.now();
      if (currentTime > this.bestPriceLastUpdateTime + 1000 * 2) {
        this.bestPriceLastUpdateTime = currentTime;
        if (this.ask && this.bestPrice.ask) {
          const prices = Object.keys(this.ask).map((p) => Number(p)).filter((p) => p < this.bestPrice.ask);
          prices.forEach((p) => {
            this.ask[p].remove();
          });
        }
        if (this.bid && this.bestPrice.bid) {
          const prices = Object.keys(this.bid).map((p) => Number(p)).filter((p) => p > this.bestPrice.bid);
          prices.forEach((p) => {
            this.bid[p].remove();
          });
        }
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
      getSymbolOrderBook(this.name, 100)
        .then((data) => {
          if (data) {
            this.ask = {};
            data.asks?.forEach((o) => {
              const price = Number(o[0]);
              const volume = Number(o[1]);
              if (this.ask[price]) {
                this.ask[price].update(volume);
              } else if (volume) {
                this.ask[price] = new Order(ASK, price, volume, this);
              }
            });
            this.bid = {};
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

  updateOrderBook = (update, first = false) => {
    if ((this.u && update?.U === this.u + 1) || first) {
      this.u = update?.u;
      update?.a?.forEach((order) => {
        const price = Number(order[0]);
        const volume = Number(order[1]);
        if (this.ask[price]) {
          this.ask[price].update(volume);
        } else if (volume) {
          this.ask[price] = new Order(ASK, price, volume, this);
        }
      });
      update?.b?.forEach((order) => {
        const price = Number(order[0]);
        const volume = Number(order[1]);
        if (this.bid[price]) {
          this.bid[price].update(volume);
        } else if (volume) {
          this.bid[price] = new Order(BID, price, volume, this);
        }
      });
    }
  };

}
