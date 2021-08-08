import {BehaviorSubject, Subject} from 'rxjs';
import {axiosSpot, getSymbolOrderBook} from '../api';
import {Order} from './Order';
import {ASK, BID} from '../constants';
import {apiTimeout, minOrderPercentage} from '../config';

export class OrderBook {

  ask;
  bid;
  bestPrice = {ask: null, bid: null};
  bestPrice$ = new Subject();
  best = {ask: null, bid: null};
  bestPriceStream;
  isTimeout;
  lastUpdateId;
  lastUpdated;
  bestPriceLastUpdateTime = Date.now();
  lines = {ask: {}, bid: {}};
  name;
  orderStream = [];
  orders;
  orderBook$ = new Subject();
  series;
  state;
  orderBookStream;
  synced = false;
  ticker;
  U;
  u;
  orderBookSubscription;
  bestPriceSubscription;
  checkId;

  constructor(ticker) {
    this.ticker = ticker;
    this.name = ticker?.name;
    this.state = ticker?.state;
    this.series = ticker?.series;
    // if (this.name) this.createStreams();
    // this.orderBookSubscription = this.ticker?.stream$?.orderBook?.subscribe(this.onOrderBookMessage);
    // this.bestPriceSubscription = this.ticker?.stream$?.bestPrice?.subscribe(this.onBestPrice);
    this.ticker?.config?.config$?.subscribe(this.checkOrders);
  }

  // closeStreams = () => {
  //   this.closeBestPriceStream();
  //   this.closeOrderBookStream();
  // }

  // convertStreamValue = (data, side) => {
  //   let converted = {};
  //   if (data?.length) {
  //     converted = data.reduce((acc, current) => {
  //       const price = Number(current[0]);
  //       const volume = Number(current[1]);
  //       if (!this[side]?.[price]) {
  //         this[side][price] = new Order(side, price, volume, this);
  //       }
  //       acc[price] = volume;
  //       return acc;
  //     }, converted);
  //   }
  //   return converted;
  // };

  // createStreams = () => {
  //   this.createOrderBookStream();
  //   this.createBestPriceStream();
  // };

  // createOrderBookStream = () => {
  //   this.orderBookStream = new WebSocket(`wss://stream.binance.com:9443/ws/${this.name.toLowerCase()}@depth@1000ms`);
  //   this.orderBookStream.addEventListener('message', this.onOrderBookMessage);
  //   this.orderBookStream.addEventListener('error', this.onOrderBookError);
  // };

  // closeOrderBookStream = () => {
  //   this.orderBookStream?.removeEventListener('message', this.onOrderBookMessage);
  //   this.orderBookStream?.removeEventListener('error', this.onOrderBookError);
  //   this.orderBookStream?.close();
  // };

  // onOrderBookError = () => {
  //   this.closeOrderBookStream();
  //   setTimeout(this.createOrderBookStream, 5000);
  // };

  // createBestPriceStream = () => {
  //   this.bestPriceStream = new WebSocket(`wss://stream.binance.com:9443/ws/${this.name.toLowerCase()}@bookTicker`);
  //   this.bestPriceStream.addEventListener('message', this.onBestPrice);
  //   this.bestPriceStream.addEventListener('error', this.onBestPriceError);
  // };

  // closeBestPriceStream = () => {
  //   this.bestPriceStream?.removeEventListener('message', this.onBestPrice);
  //   this.bestPriceStream?.removeEventListener('error', this.onBestPriceError);
  //   this.bestPriceStream?.close();
  // };

  // onBestPriceError = () => {
  //   this.closeBestPriceStream();
  //   setTimeout(this.createBestPriceStream, 5000);
  // };

  checkOrders = () => {
    this.checkId = Symbol();
    // this.best.ask?.checkVolumeOnPriceRange();
    // this.best.bid?.checkVolumeOnPriceRange();
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
            this.ask[p].remove({updateLinks: false});
          });
          // const bestAsk = this.ask[this.bestPrice.ask];
          // if (bestAsk) {
          //   bestAsk.removePrev();
          //   this.best.ask = bestAsk;
          // } else if (this.best.ask) {
          //   this.best.ask.checkBestPrice();
          // }
        }
        if (this.bid && this.bestPrice.bid) {
          const prices = Object.keys(this.bid).map((p) => Number(p)).filter((p) => p > this.bestPrice.bid);
          prices.forEach((p) => {
            this.bid[p].remove({updateLinks: false});
          });
          // const bestBid = this.bid[this.bestPrice.bid];
          // if (bestBid) {
          //   bestBid.removePrev();
          //   this.best.bid = bestBid;
          // } else if (this.best.bid) {
          //   this.best.bid.checkBestPrice();
          // }
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

  setBestPrice = (side) => {
    const cb = {
      ask: (a, b) => a - b,
      bid: (a, b) => b - a
    };
    this.bestPrice[side] = Object.keys(this[side])
      .map((p) => Number(p))
      .sort(cb[side])[0];
  };

  setOrderBook = () => {
    if (this.state.apiTimeout) {
      setTimeout(this.setOrderBook, 1000 * 60 * apiTimeout + 100);
    } else {
      getSymbolOrderBook(this.name, 100)
        .then((data) => {
          if (data) {
            let prev;
            this.ask = data.asks?.reduce((acc, o, i) => {
              const price = Number(o[0]);
              const volume = Number(o[1]);
              const order = new Order(ASK, price, volume, this);
              if (i === 0) this.best.ask = order;
              if (prev) {
                order.prev = prev;
                prev.next = order;
              }
              prev = order;
              acc[price] = order;
              return acc;
            }, {}) || {};
            prev = null;
            this.bid = data.bids?.reduce((acc, o, i) => {
              const price = Number(o[0]);
              const volume = Number(o[1]);
              const order = new Order(BID, price, volume, this);
              if (i === 0) this.best.bid = order;
              if (prev) {
                order.prev = prev;
                prev.next = order;
              }
              prev = order;
              acc[price] = order;
              return acc;
            }, {}) || {};
            // this.setBestPrice(ASK);
            // this.setBestPrice(BID);
            this.lastUpdateId = data.lastUpdateId;
            // const {bestPrice} = this;
            // const {ask, bid} = this;
            // this.orderBook$.next({ask, bid});
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
        if (price in this.ask) {
          this.ask[price].update(volume);
        } else if (volume) {
          this.ask[price] = new Order(ASK, price, volume, this);
        }
      });
      update?.b?.forEach((order) => {
        const price = Number(order[0]);
        const volume = Number(order[1]);
        if (price in this.bid) {
          this.bid[price].update(volume);
        } else if (volume) {
          this.bid[price] = new Order(BID, price, volume, this);
        }
      });
    }
  };

}
