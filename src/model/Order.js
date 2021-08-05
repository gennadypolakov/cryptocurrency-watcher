import {ask, bid, priceLine} from '../config';
import {LineStyle} from 'lightweight-charts';
import {ASK, ASK_ORDER_COLOR, BID, BID_ORDER_COLOR} from '../constants';

const orderColors = {
  [ASK]: ASK_ORDER_COLOR,
  [BID]: BID_ORDER_COLOR,
};

export class Order {

  line;
  orderBook;
  price;
  removeTimeoutId;
  ticker;
  timeoutId;
  updatedAt;
  volume;
  side; // ask | bid
  subscription;

  constructor(side, price, volume, orderBook) {
    this.orderBook = orderBook;
    this.price = price;
    this.side = side;
    this.ticker = this.orderBook.ticker;
    this.updatedAt = Date.now();
    this.volume = volume;
    this.subscription = this.orderBook?.orders$?.subscribe(this.next);
  }

  next = (orderBook) => {
    if (orderBook) {
      if (this.side && this.price && orderBook[this.side]?.[this.price] !== undefined) {
        this.volume = orderBook[this.side][this.price];
        if (this.volume) {
          this.check();
        } else {
          this.removeLine();
        }
      }
    }
  }

  check = (second = false) => {
    const {minOrderPercentage, orderTimeout, priceDistance, removeOrderPercentage, removeTimeout} = this.ticker?.config || {};
    const {averageVolume, isTimeout, price} = this.ticker || {};
    if (!isTimeout) {
      if (this.price && this.side && price) {
        const absDelta = this.side === ASK ? this.price - price : price - this.price;
        if (absDelta > 0) {
          if (absDelta / price < (priceDistance || 0)) {
            if (averageVolume && minOrderPercentage && this.volume) {
              if (this.volume >= averageVolume * minOrderPercentage) {
                if (second) {
                  this.removeLine();
                  this.createLine();
                  this.ticker?.state?.events$?.next(this);
                } else {
                  if (orderTimeout) {
                    this.timeoutId = setTimeout(() => {
                      this.check(true);
                    }, orderTimeout * 60 * 1000);
                  }
                }
              } else {
                this.removeLine();
              }
            }
          } else {
            this.removeLine();
          }
        } else if (absDelta < 0) {
          if (
            removeOrderPercentage &&
            (-1 * absDelta) / this.price > removeOrderPercentage
          ) {
            this.remove();
          } else if (removeTimeout) {
            if (this.removeTimeoutId) clearTimeout(this.removeTimeoutId);
            this.removeTimeoutId = setTimeout(this.check, removeTimeout * 60 * 1000);
          }
        }
      }
    }
  };

  checkPrice = () => {
    const {removeOrderPercentage, removeTimeout} = this.ticker?.config || {};
    if (
      removeOrderPercentage &&
      this.price &&
      this.ticker.price &&
      (
        (this.side === ask && this.price < this.ticker.price) ||
        (this.side === bid && this.price > this.ticker.price)
      ) &&
      Math.abs(this.ticker.price - this.price) / this.price > removeOrderPercentage
    ) {
      this.remove();
    } else if (removeTimeout) {
      if (this.removeTimeoutId) clearTimeout(this.removeTimeoutId);
      this.removeTimeoutId = setTimeout(this.checkPrice, removeTimeout * 60 * 1000);
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
    if (
      this.side &&
      this.price &&
      this.volume &&
      this.ticker?.series
    ) {
      this.line = this.ticker.series.createPriceLine({
        ...priceLine,
        color: orderColors[this.side],
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        price: this.price,
        lineWidth: 1,
        title: this.volume
      });
    }

  };

  remove = () => {
    if (this.removeTimeoutId) clearTimeout(this.removeTimeoutId);
    this.removeLine();
    if (this.side && this.price && this.orderBook?.[this.side]?.[this.price]) {
      delete this.orderBook[this.side][this.price];
    }
    this.subscription?.unsubscribe();
  };

  removeLine = () => {
    if (this.line && this.ticker?.series) {
      this.ticker.series.removePriceLine(this.line);
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      delete this.timeoutId;
    }
  };

}
