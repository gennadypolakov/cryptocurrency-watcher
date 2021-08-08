import {priceLine} from '../config';
import {LineStyle} from 'lightweight-charts';
import {ASK, ASK_ORDER_COLOR, BID, BID_ORDER_COLOR, ORDER_COLOR} from '../constants';

const orderColors = {
  [ASK]: ASK_ORDER_COLOR,
  [BID]: BID_ORDER_COLOR,
};

export class Order {

  bestPriceSubscription;
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
  orderBookSubscription;
  config$;
  configSubscription;
  checkId;

  prev;
  next;

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

  // next = (payload) => {
  //   this.bestPrice = payload.bestPrice?.[this.side];
  //   if (payload[this.side] && this.price in payload[this.side]) {
  //     this.volume = payload[this.side][this.price];
  //   }
  //   this.check();
  // };

  // onOrderBookOld = ({action, payload}) => {
  //   if (action && this[action]) {
  //     this[action](payload);
  //   }
  // }

  onOrderBook = (orderBook) => {
    if (orderBook) {
      if (this.side && this.price && this.price in orderBook[this.side]) {
        this.volume = orderBook[this.side][this.price];
        this.check();
      }
    }
  }

  configStream = (config) => {
    if (config?.action === this.ticker.name) {
      if (config.type === 'destroy') {

      } else {
        this.check();
      }
    }
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
            this.createLine();
            if (!isTimeout) this.ticker?.state?.events$?.next(this);
          } else {
            this.updateLine();
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

  checkVolumeOnPriceRange = (endPrice) => {
    this.checkId = this.orderBook.checkId;
    if (!endPrice) {
      const bestPrice = this.orderBook.best[this.side].price;
      const {priceDistance} = this.ticker?.config || {};
      if (bestPrice && priceDistance) {
        endPrice = this.side === ASK ? bestPrice + bestPrice * priceDistance : bestPrice - bestPrice * priceDistance;
      }
    }
    if (endPrice) {
      const delta = this.side === ASK ? endPrice - this.price : this.price - endPrice;
      if (delta > 0) {
        this.check();
        if (this.next) {
          this.next.checkVolumeOnPriceRange(endPrice);
        }
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

  checkBestPrice = () => {
    const bestPrice = this.orderBook.bestPrice[this.side];
    if (bestPrice) {
      const delta = this.side === ASK ? this.price - bestPrice : bestPrice - this.price;
      if (delta < 0) {
        if (this.next) {
          this.orderBook.best[this.side] = this.next;
          this.next?.checkBestPrice();
        }
        this.remove();
      }
    }
  };

  update = (volume) => {
      this.volume = volume;
      this.check();
  };

  updateLinks = (order) => {
    const price = order.price
    if (price) {
      const delta = this.side === ASK ? price - this.price : this.price - price;
      if (delta > 0) {
        if (this.next) {
          this.next.updateLinks(order);
        } else {
          this.next = order;
          this.next.prev = this;
        }
      } else if (delta < 0) {
        if (this.prev) {
          this.prev.next = order;
          order.prev = this.prev;
          order.next = this;
          this.prev = order;
        } else {
          this.prev = order;
          order.next = this;
        }
      }
    }
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

  removePrev = () => {
    if (this.prev) {
      this.prev.remove({prev: true, updateLinks: false});
      delete this.prev;
    }
  }

  remove = ({next = false, prev = false, updateLinks = true} = {}) => {
    if (this.removeTimeoutId) clearTimeout(this.removeTimeoutId);
    this.removeLine();
    if (this.side && this.price && this.orderBook?.[this.side] && this.price in this.orderBook[this.side]) {
      delete this.orderBook[this.side][this.price];
    }
    if (updateLinks) {
      if (this.next) {
        if (this.prev) {
          this.prev.next = this.next;
          this.next.prev = this.prev;
        } else {
          delete this.next.prev;
        }
      } else {
        if (this.prev) {
          delete this.prev.next;
        }
      }
    }
    if (next && this.next) {
      this.next.remove({next, updateLinks: false});
      delete this.prev;
    }
    if (prev && this.prev) {
      this.prev.remove({prev, updateLinks: false});
      delete this.next;
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
