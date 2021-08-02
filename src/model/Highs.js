import {checkedTimout, d1, h1, lineWidths, m5, minLevelAge, priceDistance} from '../config';
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

export class Highs {
  name;
  array = [];
  map = {};
  series;
  first; // объект
  firstD1; // объект
  last; // объект
  newHigh; // цена
  state;

  constructor(name, series, state) {
    this.series = series;
    this.state = state;
    this.name = name;
  }

  check = (price, time) => {
    if (this.array[0]?.price) {
      if (this.array[0].price < price) {
        this.removeLowerHighs(price);
        if (!this.map[price]) {
          this.createNew(price, m5, time);
        }
      } else if (
        !this.state.banned[this.name] &&
        Date.now() - this.array[0].time > 1000 * 60 * 60 * minLevelAge &&
        this.array[0].price > price &&
        (this.array[0].price - price) / price < priceDistance
      ) {
        if (!this.state?.priceNearLevel?.find?.((ticker) => ticker.name === this.name)) {
          const ticker = {
            name: this.name,
            checked: false,
            click: () => {
              ticker.checked = true;
              console.log(ticker);
              this.state?.dispatch?.(this.state);
              setTimeout(() => {
                ticker.checked = false;
                this.state?.dispatch?.(this.state);
              }, checkedTimout * 60 * 1000);
            },
            remove: () => {
              this.state.remove(ticker);
            }
            // remove: () => {
            //   this.state.priceNearLevel = this.state.priceNearLevel.filter((t) => t.name !== ticker.name);
            //   this.state.banned.push(ticker);
            //   this.state?.dispatch?.(this.state);
            //   setTimeout(() => {
            //     this.state.banned = this.state.banned.filter((t) => t.name !== ticker.name);
            //     this.state?.dispatch?.(this.state);
            //   }, bannedTimout * 60 * 1000);
            // }
          };
          this.state.priceNearLevel.push(ticker);
          this.state?.dispatch?.(this.state);
        }
      }
    }
  }

  removeLowerHighs = (price) => {
    this.array.filter((line) => line.price < price)
      .forEach((line) => {
        this.remove(line.price);
      });
  }

  // addLowest = (price) => {
  //   const high = this.create(price);
  //   if (high) {
  //     this.array = [high, ...this.array];
  //   }
  // }
  //
  // addHighest = (price) => {
  //   const high = this.create(price);
  //   if (high) {
  //     this.array = [...this.array, high];
  //   }
  // }

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
      this.array = this.array.sort((a, b) => a.price - b.price);
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
