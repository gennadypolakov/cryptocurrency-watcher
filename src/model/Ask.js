import {Order} from './Order';
import {minOrderPercentage, priceDistance} from '../config';

export class Ask extends Order {

  constructor(price, volume, orderBook) {
    super(price, volume, orderBook);
    this.check();
  }

  check = () => {
    if (
      this.price &&
      this.ticker.price &&
      this.ticker.averageVolume &&
      this.minOrderPercentage &&
      this.priceDistance &&
      this.volume &&
      (this.price - this.ticker.price) / this.ticker.price < this.priceDistance &&
      this.volume > this.ticker.averageVolume * this.minOrderPercentage
    ) {
      this.timeoutId = setTimeout(() => {
        this.createLine();
      }, this.ticker.orderTimeout * 60 * 1000);
    }
    this.checkPrice();
  };

  checkPrice = () => {
    if (
      this.price &&
      this.ticker.price &&
      this.price < this.ticker.price &&
      (this.ticker.price - this.price) / this.price > this.removeOrderPercentage
    ) {
      this.remove();
    } else {
      this.removeTimeoutId = setTimeout(this.checkPrice, this.removeTimeout * 60 * 1000);
    }
  };

}
