import {priceLine} from '../config';
import {LineStyle} from 'lightweight-charts';

export class Line {

  color;
  interval;
  price;
  priceLine;
  series;
  time;
  title;
  width;

  constructor({color, interval, price, series, time, title, width} = {}) {
    if (color) this.color = color;
    if (interval) this.interval = interval;
    if (price) this.price = price;
    if (series) this.series = series;
    if (time) this.time = time;
    if (title) this.title = title;
    if (width) this.width = width;
  }

  create = () => {
    if (this.series) {
      const options = {
        ...priceLine,
        price: this.price
      };
      if (this.color) {
        options.color = this.color;
      }
      if (this.width) {
        options.lineWidth = this.width;
      }
      if (this.title) {
        options.title = this.title;
      }
      this.priceLine = this.series.createPriceLine(options);
      setInterval(() => {
        this.priceLine.applyOptions({
          color: Math.floor(Math.random() * 2) ? 'red' : 'gray',
          lineWidth: Math.floor(Math.random() * 2) ? 1 : 2,
          lineStyle: Math.floor(Math.random() * 2) ? LineStyle.Dashed : LineStyle.Solid
        });
      }, 1000);
    }
    return this;
  }

  remove = () => {
    if (this.series && this.priceLine) {
      this.series.removePriceLine(this.priceLine);
    }
  }

}
