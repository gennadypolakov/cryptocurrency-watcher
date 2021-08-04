import {BehaviorSubject} from 'rxjs';
import {axiosSpot} from '../api';
import {ask, bid} from '../config';
import {Order} from './Order';
import {ASK, BID} from '../constants';

export class OrderBook {

  ask;
  bid;
  isTimeout;
  lastUpdateId;
  name;
  orderStream = [];
  orders = {[ASK]: {}, [BID]: {}};
  orders$ = new BehaviorSubject({[ASK]: {}, [BID]: {}});
  series;
  state;
  stream;
  synced = false;
  ticker;
  U;
  u;

  constructor(ticker) {
    this.ticker = ticker;
    this.name = ticker?.name;
    this.state = ticker?.state;
    this.series = ticker?.series;
    if (this.name) this.createStream();
  }

  closeStream = () => {
    this.stream?.removeEventListener('message', this.onStreamMessage);
    this.stream?.close();
  }

  convertStreamValue = (data, side) => {
    let converted = {};
    if (data?.length) {
      converted = data.reduce((acc, current) => {
        const price = Number(current[0]);
        const volume = Number(current[1]);
        if (!this[side]?.[price]) {
          this[side][price] = new Order(side, price, volume, this);
        }
        acc[price] = volume;
        return acc;
      }, converted);
    }
    return converted;
  };

  createStream = () => {
    this.stream = new WebSocket(`wss://stream.binance.com:9443/ws/${this.name.toLowerCase()}@depth@1000ms`);
    this.stream.onmessage = this.onStreamMessage;
  };

  enableTimeout = () => {
    this.isTimeout = true;
    setTimeout(() => {
      this.isTimeout = false;
    }, (this.ticker?.config?.notificationTimeout || 5) * 1000 * 60);
  };

  onStreamMessage = (e) => {
    if (e.data) {
      const update = JSON.parse(e.data);
      if (this.synced) {
        if (!this.isTimeout) this.updateOrderBook(update);
      } else {
        this.orderStream.push(update);
      }
      if (!this.ask && !this.bid) {
        this.ask = {};
        this.bid = {};
        axiosSpot.get('/api/v3/depth', {params: {symbol: this.name, limit: 1000}}).then((data) => {
          if (data.data) {
            data.data.asks.forEach((o) => {
              const price = Number(o[0]);
              const volume = Number(o[1]);
              this.ask[price] = new Order(ask, price, volume, this);
            });
            data.data.bids.forEach((o) => {
              const price = Number(o[0]);
              const volume = Number(o[1]);
              this.bid[price] = new Order(bid, price, volume, this);
            });
            this.lastUpdateId = data.data.lastUpdateId;
            this.syncOrderBook();
          }
        });
      }
    }
  };

  remove = () => {
    this.closeStream();
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
      let ask = {};
      let bid = {};
      if (update?.a) {
        ask = this.convertStreamValue(update.a, ASK);
      }
      if (update?.b) {
        bid = this.convertStreamValue(update.b, BID);
      }
      this.orders$.next({ask, bid});
    }
  };

}
