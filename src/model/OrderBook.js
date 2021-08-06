import {BehaviorSubject} from 'rxjs';
import {axiosSpot} from '../api';
import {Order} from './Order';
import {ASK, BID} from '../constants';

export class OrderBook {

  isTimeout;
  lastUpdateId;
  name;
  orderStream = [];
  orders;
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
      if (!this.orders) {
        this.orders = {};
        axiosSpot.get('/api/v3/depth', {params: {symbol: this.name, limit: 1000}}).then((data) => {
          if (data.data) {
            data.data.asks?.forEach((o) => {
              const price = Number(o[0]);
              const volume = Number(o[1]);
              this.orders[price] = new Order(ASK, price, volume, this);
            });
            data.data.bids?.forEach((o) => {
              const price = Number(o[0]);
              const volume = Number(o[1]);
              this.orders[price] = new Order(BID, price, volume, this);
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
    if (this.orders) Object.keys(this.orders).forEach((price) => this.orders[price].remove());
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
        if (this.orders?.[price]) {
          this.orders[price].update(volume, ASK);
        } else {
          this.orders[price] = new Order(ASK, price, volume, this);
        }
      });
      update?.b?.forEach((order) => {
        const price = Number(order[0]);
        const volume = Number(order[1]);
        if (this.orders?.[price]) {
          this.orders[price].update(volume, BID);
        } else {
          this.orders[price] = new Order(BID, price, volume, this);
        }
      });
    }
  };

}
