import {priceLine} from '../config';
import {LineStyle} from 'lightweight-charts';
import {ASK, ORDER_COLOR} from '../constants';

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

  isInPriceRange = () => {
    const bestPrice = this.orderBook.bestPrice[this.side];
    if (this.price && bestPrice) {
      const delta = this.side === ASK ? this.price - bestPrice : bestPrice - this.price;
      if (delta < 0) {
        this.remove();
      } else {
        const priceDistance = this.ticker?.config?.priceDistance || 0;
        if (delta / bestPrice <= priceDistance) {
          return true;
        } else {
          this.removeLine();
          return false;
        }
      }
    }
    return false;
  };

  check = (second = false) => {
    if (!this.volume) {
      this.removeLine();
    } else {
      if (this.isInPriceRange()) {
        const {minOrderPercentage, orderTimeout} = this.ticker?.config || {};
        const {averageVolume, isTimeout} = this.ticker || {};
        if (this.volume >= averageVolume * minOrderPercentage) {
          if (second) {
            this.removeLine();
            this.createLine();
            if (!isTimeout && !this.viewed) this.ticker?.state?.events$?.next(this);
          } else {
            this.removeLine();
            this.createLine();
            if (orderTimeout) {
              this.timeoutId = setTimeout(() => {
                this.check(true);
              }, orderTimeout * 60 * 1000);
            }
          }
        } else {
          this.removeLine();
        }
      } else {
        this.removeLine();
      }
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
        title: this.volume
      });
    }
  };

  createLine = () => {
    if (
      !this.orderBook.lines[this.side][this.price] &&
      this.side &&
      this.price &&
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
          title: this.volume
        });
        if (this.orderBook.lines?.[this.side]) {
          this.orderBook.lines[this.side][this.price] = this;
        }
      }
    }

  };

  remove = () => {
    if (this.removeTimeoutId) clearTimeout(this.removeTimeoutId);
    this.removeLine();
    if (this.side && this.price && this.orderBook?.[this.side] && this.price in this.orderBook[this.side]) {
      delete this.orderBook[this.side][this.price];
    }
    const {state, name} = this.ticker || {};
    if (state && name && state.events?.[name]?.order?.[this.price]) {
      delete state.events[name].order[this.price];
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
