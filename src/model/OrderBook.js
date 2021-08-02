import {LineStyle} from 'lightweight-charts';
import {axiosSpot} from '../api';
import {ask, bid, m5, minOrderPercentage, priceDistance, priceLine} from '../config';
import {Order} from './Order';

export class OrderBook {

  ask;
  averageVolume;
  bid;
  lastUpdateId;
  name;
  orderStream = [];
  orders = {ask: {}, bid: {}};
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

  createStream = () => {
    this.stream = new WebSocket(`wss://stream.binance.com:9443/ws/${this.name.toLowerCase()}@depth@1000ms`);
    this.stream.onmessage = this.onStreamMessage;
  };

  onStreamMessage = (e) => {
    if (e.data) {
      const update = JSON.parse(e.data);
      if (this.synced) {
        this.updateOrderBook(update);
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
      update?.a?.forEach((o) => {
        const volume = Number(o[1]);
        const price = Number(o[0]);
        if (this.ask[price]) {
          this.ask[price].update(volume);
        } else {
          this.ask[price] = new Order(ask, price, volume, this);
        }
      });
      update?.b?.forEach((o) => {
        const volume = Number(o[1]);
        const price = Number(o[0]);
        if (this.bid[price]) {
          this.bid[price].update(volume);
        } else {
          this.bid[price] = new Order(bid, price, volume, this);
        }
      });
    }
    let lines = Object.keys(this.ask).filter((p) => this.ask[p].line).length;
    if (lines > 1) {
      console.log(this.name);
      const data = this.ticker?.chartData?.[m5]?.array;
      if (data?.length && data.length > 21) {
        const last4 = data.slice(data.length - 21, data.length - 1)?.map((bar) => bar.volume);
        console.log('last 21', last4);
        const averageVolume4 = last4.reduce((acc, value) => acc + value, 0) / last4.length;
        console.log('averageVolume 20', averageVolume4);
        const last5 = data.slice(data.length - 5, data.length)?.map((bar) => bar.volume);
        console.log('last 5', last5);
        const averageVolume = last5.reduce((acc, value) => acc + value, 0) / last5.length;
        console.log('averageVolume 5', averageVolume);
      }
    }
    lines = Object.keys(this.bid).filter((p) => this.bid[p].line).length;
    if (lines > 1) {
      console.log(this.name);
      const data = this.ticker?.chartData?.[m5]?.array;
      if (data?.length && data.length > 20) {
        const last4 = data.slice(data.length - 21, data.length - 1)?.map((bar) => bar.volume);
        console.log('last 20', last4);
        const averageVolume4 = last4.reduce((acc, value) => acc + value, 0) / last4.length;
        console.log('averageVolume 20', averageVolume4);
        const last5 = data.slice(data.length - 5, data.length)?.map((bar) => bar.volume);
        console.log('last 5', last5);
        const averageVolume = last5.reduce((acc, value) => acc + value, 0) / last5.length;
        console.log('averageVolume 5', averageVolume);
      }
    }
  };

  setOrderLines = () => {
    // искать плотности больше чем 1/4 объема на 5 минутах
    if (this.ask) {
      let askPrices = Object.keys(this.ask).map((ask) => Number(ask)).sort((a, b) => a - b);
      const bestAsk = askPrices[0];
      let volumes;
      this.averageVolume = this.ticker.averageVolume;
      if (this.averageVolume) {
        volumes = askPrices
          .filter((price) => (price - bestAsk) / bestAsk < priceDistance && this.ask[price] > this.averageVolume * minOrderPercentage)
          .map((price) => [price, this.ask[price]]);
      } else {
        askPrices = askPrices
          .filter((price) => (price - bestAsk) / bestAsk < priceDistance)
          .sort((a, b) => this.ask[b] - this.ask[a]);
        volumes = [askPrices[0], this.ask[askPrices[0]]];
      }
      const orders = this.orders.ask;
      if (this.series) {
        if (orders) {
          Object.keys(orders).forEach((price) => {
            this.series.removePriceLine(orders[price]);
            delete orders[price];
          });
        }
        volumes?.forEach((volume) => {
          orders[volume[0]] = this.series.createPriceLine({
            ...priceLine,
            color: '#107b00',
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            price: volume[0],
            lineWidth: 1,
            title: volume[1]
          });
        });
      }
    }
    if (this.bid) {
      let bidPrices = Object.keys(this.bid).map((bid) => Number(bid)).sort((a, b) => b - a);
      const bestBid = bidPrices[0];
      let volumes;
      if (this.averageVolume) {
        volumes = bidPrices
          .filter((price) => (bestBid - price) / bestBid < priceDistance && this.bid[price] > this.averageVolume * minOrderPercentage)
          .map((price) => [price, this.bid[price]]);
      } else {
        bidPrices = bidPrices
          .filter((price) => (bestBid - price) / bestBid < priceDistance)
          .sort((a, b) => this.bid[b] - this.bid[a]);
        volumes = [bidPrices[0], this.bid[bidPrices[0]]];
      }
      const orders = this.orders.bid;
      if (this.series) {
        if (orders) {
          Object.keys(orders).forEach((price) => {
            this.series.removePriceLine(orders[price]);
            delete orders[price];
          });
        }
        volumes?.forEach((volume) => {
          orders[volume[0]] = this.series.createPriceLine({
            ...priceLine,
            color: '#107b00',
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            price: volume[0],
            lineWidth: 1,
            title: volume[1]
          });
        });
      }
    }
  };

}
