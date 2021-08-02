import {ask, bid, minOrderPercentage, priceDistance, priceLine, removeOrderPercentage, removeTimeout} from '../config';
import {LineStyle} from 'lightweight-charts';

export class Order {

  line;
  minOrderPercentage = minOrderPercentage;
  orderBook;
  price;
  priceDistance = priceDistance;
  removeOrderPercentage = removeOrderPercentage;
  removeTimeout = removeTimeout;
  removeTimeoutId;
  ticker;
  timeoutId;
  updatedAt;
  volume;
  side = ask; // bid

  constructor(side, price, volume, orderBook) {
    this.orderBook = orderBook;
    this.price = price;
    this.side = side;
    this.ticker = this.orderBook.ticker;
    this.updatedAt = Date.now();
    this.volume = volume;
  }

  check = (second = false) => {
    if (
      this.price &&
      this.ticker.price &&
      this.ticker.averageVolume &&
      this.minOrderPercentage &&
      this.priceDistance &&
      this.volume &&
      Math.abs(this.ticker.price - this.price) / this.ticker.price < this.priceDistance &&
      this.volume > this.ticker.averageVolume * this.minOrderPercentage
    ) {
      if (second) {
        console.log('second check', this.ticker.name, 'averageVolume', this.ticker.averageVolume, 'volume', this.volume)
        this.removeLine();
        this.createLine();
      } else {
        this.timeoutId = setTimeout(() => {
          this.check(true);
        }, this.ticker.orderTimeout * 60 * 1000);
      }
    } else if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      delete this.timeoutId;
    }
    this.checkPrice();
  };

  checkPrice = () => {
    if (
      this.price &&
      this.ticker.price &&
      (
        (this.side === ask && this.price < this.ticker.price) ||
        (this.side === bid && this.price > this.ticker.price)
      ) &&
      Math.abs(this.ticker.price - this.price) / this.price > this.removeOrderPercentage
    ) {
      this.remove();
    } else {
      if (this.removeTimeoutId) clearTimeout(this.removeTimeoutId);
      this.removeTimeoutId = setTimeout(this.checkPrice, this.removeTimeout * 60 * 1000);
    }
  };

  update = (volume) => {
    if (volume) {
      this.volume = volume;
      this.check();
    } else {
      this.remove();
    }
  };

  createLine = () => {
    if (this.ticker?.series) {
      this.line = this.ticker.series.createPriceLine({
        ...priceLine,
        color: '#107b00',
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        price: this.price,
        lineWidth: 1,
        title: `${this.price} | ${this.volume}`
      });
    }

  };

  remove = () => {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.removeTimeoutId) clearTimeout(this.removeTimeoutId);
    this.removeLine();
    if (this.side && this.price && this.orderBook?.[this.side]?.[this.price]) {
      delete this.orderBook[this.side][this.price];
    }
  };

  removeLine = () => {
    if (this.line && this.ticker?.series) {
      this.ticker.series.removePriceLine(this.line);
    }
  };

}
