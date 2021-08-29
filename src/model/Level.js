import {CROSSED_LEVEL_COLOR, D1, H1, HIGH, LEVEL_COLOR, M5} from '../constants';
import {lineWidths, priceLine} from '../config';
import {LineStyle} from 'lightweight-charts';

export class Level {

  configSubscription;
  currentPrice;
  interval;
  isActual = true;
  line;
  price;
  priceSubscription;
  side;
  time;
  ticker;
  viewed;
  blinkIntervalId;
  lineStyle = LineStyle.Solid;

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
    const priceDelta = this.side === HIGH ? this.price - price : price - this.price;
    const currentTime = Date.now();
    const timeDelta = currentTime - (this.time || currentTime) - minLevelAge * 1000 * 60 * 60;
    if (priceDelta > 0) {
      if (priceDelta / price < priceDistance && timeDelta > 0 && this.isActual) {
        if (!this.ticker.isTimeout && !this.viewed) {
          this.ticker?.state?.events$?.next(this);
        }
        if (!this.blinkIntervalId) {
          this.blinkIntervalId = setInterval(() => {
            this.line?.applyOptions({
              lineStyle: this.lineStyle
            });
            this.lineStyle = this.lineStyle === LineStyle.Solid ? LineStyle.Dashed : LineStyle.Solid;
          }, 1000);
        }
      } else if (this.blinkIntervalId) {
        clearInterval(this.blinkIntervalId);
        delete this.blinkIntervalId;
        this.line?.applyOptions({
          lineStyle: this.isActual ? LineStyle.Solid : LineStyle.Dashed
        });
      }
    } else if (priceDelta < 0) {
      if (this.blinkIntervalId) clearInterval(this.blinkIntervalId);
      delete this.blinkIntervalId;
      this.line?.applyOptions({
        color: CROSSED_LEVEL_COLOR,
        lineWidth: lineWidths[this.interval] || 1,
        lineStyle: LineStyle.Dashed
      });
      this.isActual = false;
      this.priceSubscription?.unsubscribe();
    }
  };

  checkLevelOnPrice = () => {
    const existing = this.ticker?.levels?.[this.price];
    let removeExisting = false;
    if (this.interval === D1 && this.time > Date.now() - 1000 * 60 * 60 * 24) {
      this.time = Date.now() - 1000 * 60 * 60;
      this.interval = H1
    }
    const {interval, time} = this;
    if (existing) {
      if (interval && existing.interval) {
        if (interval === existing.interval) {
          if (time && existing.time && time < existing.time) {
            removeExisting = true;
          }
        } else if (interval === D1) {
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
    const color = this.isActual ? LEVEL_COLOR : CROSSED_LEVEL_COLOR;
    const lineStyle = this.interval === M5 || !this.isActual ? LineStyle.Dashed : LineStyle.Solid;
    this.line = this.ticker?.series?.createPriceLine({
      ...priceLine,
      color,
      lineStyle,
      axisLabelVisible: true,
      price: this.price,
      lineWidth: lineWidths[this.interval] || 1
    });
  };

  removeLine = () => {
    if (this.ticker?.series && this.line) {
      this.ticker.series.removePriceLine(this.line);
      this.line = null;
    }
  };

  destroy = () => {
    if (this.line) this.ticker?.series?.removePriceLine(this.line);
    if (this.price && this.ticker?.levels?.[this.price]) {
      delete this.ticker.levels[this.price];
      this.ticker.state?.removeEvent(this.ticker.name, 'level', this.price);
    }
    this.priceSubscription?.unsubscribe();
  };

  onPrice = (price) => {
    if (price) {
      this.check(price);
    }
  };

  setLevel = () => {
    this.createLine();
    if (this.price && this.ticker?.levels) {
      this.ticker.levels[this.price] = this;
    }
    if (this.ticker.price$) {
      this.priceSubscription = this.ticker.price$.subscribe(this.onPrice);
    }
  }

}
