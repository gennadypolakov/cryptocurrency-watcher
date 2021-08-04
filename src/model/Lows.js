import {d1, lineWidths, m5} from '../config';
import {Line} from './Line';

const options = {
  color: '#9912be',
  interval: m5,
  price: 0,
  series: null,
  time: 0,
  title: '',
  width: 1
};

export class Lows {
  name;
  array = [];
  map = {};
  series;
  state;
  ticker;

  constructor(ticker) {
    this.ticker = ticker;
    this.series = ticker?.series;
    this.state = ticker?.state;
    this.name = ticker?.name;
  }

  check = (price, time) => {
    const {checkedTimout, minLevelAge, priceDistance} = this.ticker?.config || {};
    if (this.array[0]?.price) {
      if (this.array[0].price > price) {
        this.removeHigherLow(price);
        if (!this.map[price]) {
          this.createNew(price, m5, time);
        }
      } else if (
        priceDistance &&
        !this.state.banned[this.name] &&
        (!minLevelAge || Date.now() - this.array[0].time > 1000 * 60 * 60 * minLevelAge) &&
        this.array[0].price < price &&
        (price - this.array[0].price) / price < priceDistance
      ) {
        if (!this.state?.priceNearLevel?.find?.((ticker) => ticker.name === this.name)) {
          const ticker = {
            name: this.name,
            checked: false,
            click: () => {
              ticker.checked = true;
              this.state?.dispatch?.(this.state);
              if (checkedTimout) {
                setTimeout(() => {
                  ticker.checked = false;
                  this.state?.dispatch?.(this.state);
                }, checkedTimout * 60 * 1000);
              }
            },
            remove: () => {
              this.state.remove(ticker);
            }
          };
          this.state.priceNearLevel.push(ticker);
          this.state?.dispatch?.(this.state);
        }
      }
    }
  }

  removeHigherLow = (price) => {
    this.array.filter((line) => line.price > price)
      .forEach((line) => {
        this.remove(line.price);
      });
  }

  create = (price, interval, time) => {
    if (price) {
      if (this.map[price]) {
        if (interval && this.map[price].interval) {
          if (interval === this.map[price].interval) {
            if (time && this.map[price].time && time < this.map[price].time) {
              this.remove(price);
              this.createNew(price, interval, time);
            }
          } else if (interval === d1) {
            this.remove(price);
            this.createNew(price, interval, time);
          }
        }
      } else {
        this.createNew(price, interval, time);
      }
    }
  }

  createNew = (price, interval, time) => {
    if (this.series && price) {
      this.map[price] = new Line({
        ...options,
        price,
        series: this.series,
        interval: interval || m5,
        time: time || Date.now(),
        width: interval && lineWidths[interval] ? lineWidths[interval] : 1
      }).create();
      this.array.push(this.map[price]);
      this.array = this.array.sort((a, b) => b.price - a.price);
    }
  }

  remove = (price) => {
    if (price && this.map[price]) {
      this.array = this.array.filter((line) => line !== this.map[price]);
      this.map[price].remove();
      delete this.map[price];
    }
  }

  clear() {
    this.array.forEach((line) => {
      line.remove();
    });
    this.array = [];
    this.map = {};
  }

}
