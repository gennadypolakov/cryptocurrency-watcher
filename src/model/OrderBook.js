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

  constructor(ticker) {
    this.ticker = ticker;
    this.name = ticker?.name;
    this.state = ticker?.state;
    this.series = ticker?.series;
    // if (this.name) this.createStreams();
    // this.orderBookSubscription = this.ticker?.stream$?.orderBook?.subscribe(this.onOrderBookMessage);
    // this.bestPriceSubscription = this.ticker?.stream$?.bestPrice?.subscribe(this.onBestPrice);
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

  onOrderBookMessage = (update) => {
    console.log('onOrderBookMessage', update);
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
      if (currentTime > this.bestPriceLastUpdateTime + 1000) {
        this.bestPriceLastUpdateTime = currentTime;
        if (this.ask && this.bestPrice.ask) {
          const bestAsk = this.ask[this.bestPrice.ask];
          if (bestAsk) {
            bestAsk.removePrev();
            this.best.ask = bestAsk;
          } else if (this.best.ask) {
            this.best.ask.checkBestPrice();
          }
        }
        if (this.bid && this.bestPrice.bid) {
          const bestBid = this.bid[this.bestPrice.bid];
          if (bestBid) {
            bestBid.removePrev();
            this.best.bid = bestBid;
          } else if (this.best.bid) {
            this.best.bid.checkBestPrice();
          }
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
            // const averageVolume = this.ticker?.averageVolume || 0;
            // const minOrderPercentage = this.ticker?.config?.minOrderPercentage || 1;
            console.log('asks', data.asks);
            console.log('bids', data.bids);
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
    // this.closeStreams();
    this.orderBookSubscription?.unsubscribe();
    this.bestPriceSubscription?.unsubscribe();
    if (this.ask) Object.keys(this.ask).forEach((price) => this.ask[price].remove());
    if (this.bid) Object.keys(this.bid).forEach((price) => this.bid[price].remove());
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
      console.log('ask update', update?.a)
      console.log('bid update', update?.b)
      let lastUpdated;
      update?.a?.forEach((order) => {
        const price = Number(order[0]);
        const volume = Number(order[1]);
        if (price in this.ask) {
          this.ask[price].update(volume);
          lastUpdated = this.ask[price];
        } else {
          lastUpdated = lastUpdated || this.best.ask;
          this.ask[price] = new Order(ASK, price, volume, this);
          lastUpdated.updateLinks(this.ask[price]);
        }
      });
      lastUpdated = null;
      update?.b?.forEach((order) => {
        const price = Number(order[0]);
        const volume = Number(order[1]);
        if (price in this.bid) {
          this.bid[price].update(volume);
          lastUpdated = this.bid[price];
        } else {
          lastUpdated = lastUpdated || this.best.bid;
          this.bid[price] = new Order(BID, price, volume, this);
          lastUpdated.updateLinks(this.bid[price]);
        }
      });
      // this.setBestPrice(ASK);
      // this.setBestPrice(BID);
      // const {bestPrice} = this;
      // this.orderBook$.next({ask, bid});
    }
  };

}
