import {priceLine} from '../config';
import {LineStyle} from 'lightweight-charts';
import {ASK, ORDER_COLOR} from '../constants';
import {getShorted} from './Ticker';

export class Order {

  id;
  bestPrice;
  line;
  orderBook;
  price;
  removeTimeoutId;
  ticker;
  timeoutId;
  updatedAt;
  volume;
  side; // ask | bid
  checkId;
  viewed;

  constructor(side, price, volume, orderBook) {
    this.orderBook = orderBook;
    this.price = price;
    this.side = side;
    this.ticker = this.orderBook.ticker;
    this.updatedAt = Date.now();
    this.volume = volume;
    this.check();
  }

  // getPriceDelta = () => {
  //
  // };

  // isInPriceRange = () => {
  //   const bestPrice = this.orderBook.bestPrice[this.side];
  //   if (this.price && bestPrice) {
  //     const delta = this.side === ASK ? this.price - bestPrice : bestPrice - this.price;
  //     if (delta < 0) {
  //       this.remove();
  //     } else {
  //       const priceDistance = this.ticker?.config?.priceDistance || 0;
  //       if (delta / bestPrice <= priceDistance) {
  //         return true;
  //       } else {
  //         this.removeLine();
  //         return false;
  //       }
  //     }
  //   }
  //   return false;
  // };

  checkPrice = () => {
    const bestPrice = this.orderBook.bestPrice[this.side];
    if (this.price && bestPrice) {
      const delta = this.side === ASK ? this.price - bestPrice : bestPrice - this.price;
      if (delta < 0) {
        this.remove();
      } else {
        const priceDistance = this.ticker?.config?.priceDistance || 0;
        if (delta / bestPrice <= priceDistance) {
          return true;
        }
      }
    }
    return false;
  };

  checkVolume = () => {
    if (this.volume && this.ticker) {
      const {averageVolume, config} = this.ticker;
      if (averageVolume && config) {
        const {minOrderPercentage = 2} = config;
        if (this.volume >= averageVolume * minOrderPercentage) {
          return true;
        }
      }
    }
    return false;
  };

  check = (second = false) => {
      if (this.checkVolume() && this.checkPrice()) {
        this.removeLine();
        this.createLine();
        if (second) {
          if (!this.ticker?.isTimeout && !this.viewed) {
            this.ticker?.state?.events$?.next(this);
          }
        } else {
          this.timeoutId = setTimeout(() => {
            this.check(true);
          }, (this.ticker?.config?.orderTimeout || 0) * 60 * 1000);
        }
      } else {
        this.removeLine();
      }
  };

  checkLine = (checkId) => {
    if (checkId) {
      this.checkId = checkId;
      this.check();
    } else if (this.checkId !== this.orderBook.checkId) {
      this.check();
    }
  }

  update = (volume) => {
      this.volume = volume;
      this.check();
  };

  updateLine = () => {
    if (this.line && this.side && this.volume) {
      this.line?.applyOptions({
        title: getShorted(this.volume)
      });
    }
  };

  createLine = () => {
    if (
      this.side &&
      this.price &&
      !this.orderBook.lines[this.side][this.price] &&
      this.volume
    ) {
      if (this.line) {
        this.updateLine();
      } else {
        this.line = this.ticker?.series?.createPriceLine({
          ...priceLine,
          color: ORDER_COLOR,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          price: this.price,
          lineWidth: 1,
          title: getShorted(this.volume)
        });
        this.orderBook.lines[this.side][this.price] = this;
      }
    }

  };

  remove = () => {
    if (this.removeTimeoutId) clearTimeout(this.removeTimeoutId);
    this.removeLine();
    if (this.orderBook?.[this.side]?.[this.price]) {
      delete this.orderBook[this.side][this.price];
    }
    const {state, name} = this.ticker || {};
    if (state && name && this.price) {
      state.removeEvent(name, this.price, 'order');
    }
  };

  removeLine = () => {
    if (this.line && this.ticker?.series) {
      this.ticker.series.removePriceLine(this.line);
    }
    if (this.orderBook.lines?.[this.side]?.[this.price]) {
      delete this.orderBook.lines[this.side][this.price];
    }
    this.line = null;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      delete this.timeoutId;
    }
  };

}
