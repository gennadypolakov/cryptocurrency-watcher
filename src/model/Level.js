import {CROSSED_LEVEL_COLOR, HIGH, LEVEL_COLOR, LOW, M5} from '../constants';
import {d1, lineWidths, priceLine} from '../config';
import {LineStyle} from 'lightweight-charts';

export class Level {

  currentPrice;
  interval;
  isActual = true;
  line;
  price;
  side;
  subscription;
  time;
  ticker;

  constructor({interval, price, side, ticker, time} = {}) {
    this.interval = interval || M5;
    this.price = price;
    this.side = side;
    this.ticker = ticker;
    this.time = time || Date.now();

    if (this.interval === M5) {
      this.setLevel();
    } else {
      this.checkLevelOnPrice();
    }
  }

  check = (update) => {
    const price = update[this.side];
    const {minLevelAge = 0, priceDistance = 1} = this.ticker?.config || {};
    const absDelta = this.side === HIGH ? this.price - price : price - this.price;
    const timeDelta = Date.now() - (this.time || Date.now()) - minLevelAge * 1000 * 60 * 60;
    if (absDelta > 0) {
      if (absDelta / price < priceDistance && timeDelta > 0) {
        this.ticker?.state?.events$?.next(this);
      }
    } else if (absDelta < 0) {
      if (!this.ticker?.levels?.[price]) {
        const {ticker, side} = this;
        new Level({price, side, ticker});
      }
      if (this.interval === M5) {
        this.destroy();
      } else {
        this.line?.applyOptions({
          color: CROSSED_LEVEL_COLOR,
          lineWidth: lineWidths[this.interval] || 1,
          lineStyle: LineStyle.Dashed
        });
        this.isActual = false;
        this.subscription?.unsubscribe();
      }
    }
  };

  checkLevelOnPrice = () => {
    const existing = this.ticker?.levels?.[this.price];
    let removeExisting = false;
    const {interval, time} = this;
    if (existing) {
      if (interval && existing.interval) {
        if (interval === existing.interval) {
          if (time && existing.time && time < existing.time) {
            removeExisting = true;
          }
        } else if (interval === d1) {
          removeExisting = true;
        }
      }
      if (removeExisting) {
        existing.destroy();
        this.setLevel();
      }
    } else {
      this.setLevel();
    }
  };

  createLine = () => {
    this.line = this.ticker?.series?.createPriceLine({
      ...priceLine,
      color: LEVEL_COLOR,
      lineStyle: this.interval === M5 ? LineStyle.Dashed : LineStyle.Solid,
      axisLabelVisible: true,
      price: this.price,
      lineWidth: lineWidths[this.interval] || 1
    });
  };

  destroy = () => {
    this.subscription?.unsubscribe();
    if (this.line) this.ticker?.series?.removePriceLine(this.line);
    if (this.price && this.ticker?.levels?.[this.price]) {
      delete this.ticker.levels[this.price];
    }
  };

  onPrice = (price) => {
    if (price) {
      if (price === -1) this.destroy();
      else this.check(price);
    }
  };

  setLevel = () => {
    this.createLine();
    if (this.price && this.ticker?.levels) {
      this.ticker.levels[this.price] = this;
    }
    if (this.ticker?.price$) {
      this.subscription = this.ticker.price$.subscribe(this.onPrice);
    }
  }

}
