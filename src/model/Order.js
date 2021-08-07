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

  constructor(side, price, volume, orderBook) {
    this.orderBook = orderBook;
    this.price = price;
    this.side = side;
    this.ticker = this.orderBook.ticker;
    this.updatedAt = Date.now();
    this.volume = volume;
    this.configSubscription = this.ticker?.config?.config$?.subscribe(this.configStream);
    this.bestPriceSubscription = this.orderBook?.bestPrice$?.subscribe(this.onBestPrice);
  }

  onBestPrice = (bestPrices) => {
    const bestPrice = bestPrices[this.side];
    if (bestPrice) {
      this.bestPrice = bestPrice;
      this.checkPriceDelta();
    }
  };

  checkPriceDelta = () => {
    if (this.price && this.bestPrice) {
      const delta = this.side === ASK ? this.price - this.bestPrice : this.bestPrice - this.price;
      if (delta < 0) {
        this.remove();
      } else {
        const priceDistance = this.ticker?.config?.priceDistance || 0;
        if (delta / this.bestPrice <= priceDistance) {
          if (!this.orderBookSubscription) {
            this.orderBookSubscription = this.orderBook?.orderBook$?.subscribe(this.onOrderBook);
          }
        } else {
          this.removeLine();
          if (this.orderBookSubscription) {
            this.orderBookSubscription.unsubscribe();
            delete this.orderBookSubscription;
          }
        }
      }
    }
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
      this.remove();
    } else {
      this.checkPriceDelta();
      if (this.orderBookSubscription) {
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
      }
    }

  };

  remove = () => {
    if (this.removeTimeoutId) clearTimeout(this.removeTimeoutId);
    this.removeLine();
    if (this.side && this.price && this.price in this.orderBook[this.side]) {
      delete this.orderBook[this.side][this.price];
    }
    this.bestPriceSubscription?.unsubscribe();
    this.configSubscription?.unsubscribe();
    this.orderBookSubscription?.unsubscribe();
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
