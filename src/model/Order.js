import {priceLine} from '../config';
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
  config$;
  configSubscription;

  constructor(side, price, volume, orderBook) {
    this.orderBook = orderBook;
    this.price = price;
    this.side = side;
    this.ticker = this.orderBook.ticker;
    this.updatedAt = Date.now();
    this.volume = volume;
    this.subscription = this.orderBook?.orders$?.subscribe(this.next);
    this.configSubscription = this.ticker?.config?.config$?.subscribe(this.configStream);
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

  configStream = (config) => {
    if (config?.action === this.ticker.name) {
      if (config.type === 'destroy') {

      } else {
        this.check();
      }
    }
  };

  check = (second = false) => {
    const {minOrderPercentage, orderTimeout, priceDistance} = this.ticker?.config || {};
    const {averageVolume, isTimeout, price} = this.ticker || {};
    if (this.price && this.side && price) {
      if (this.volume >= averageVolume * minOrderPercentage) {
        const absDelta = this.side === ASK ? this.price - price : price - this.price;
        if (absDelta > 0) {
          if (absDelta / price < (priceDistance || 0)) {
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
        } else if (absDelta < 0) {
          this.removeLine();
        }
      } else {
        this.removeLine();
      }
    }
  };

  update = (volume, side) => {
    if (volume) {
      this.volume = volume;
      this.side = side;
      this.check();
    } else {
      this.remove();
    }
  };

  updateLine = () => {
    if (this.line && this.side && this.volume) {
      this.line?.applyOptions({
        color: orderColors[this.side],
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
          color: orderColors[this.side],
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          price: this.price,
          lineWidth: 1,
          title: this.volume
        });
      }
    }

  };

  remove = () => {
    if (this.removeTimeoutId) clearTimeout(this.removeTimeoutId);
    this.removeLine();
    if (this.side && this.price && this.orderBook?.orders?.[this.price]) {
      delete this.orderBook.orders[this.price];
    }
    this.configSubscription?.unsubscribe();
    this.subscription?.unsubscribe();
  };

  removeLine = () => {
    if (this.line && this.ticker?.series) {
      this.ticker.series.removePriceLine(this.line);
    }
    this.line = null;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      delete this.timeoutId;
    }
  };

}
