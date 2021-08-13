import {OrderBook} from './OrderBook';
import {createChart as createChartFn} from 'lightweight-charts';
import {getSymbolChartData, getSymbolChartDataByRange} from '../api';
import {chartLimit, d1, h1, m5} from '../config';
import {Bar} from './Bar';
import {Settings} from './Settings';
import {Subject} from 'rxjs';
import {barPrices, D1, H1, HIGH, LOW, M5} from '../constants';
import {Level} from './Level';

const nextInterval = {
  [m5]: h1,
  [h1]: d1
};

const methods = {
  onOrderBook: '@depth@1000ms',
  onChart: '@kline_5m',
  onBestPrice: '@bookTicker',
};

export const getShorted = (v) => {
  let shorted;
  if (v > 1000000) {
    if (v / 1000000 < 10) {
      shorted = Math.round(v / 1000000 * 10) / 10 + 'M';
    } else {
      shorted = Math.round(v / 1000000) + 'M';
    }
  } else if (v > 1000) {
    if (v / 1000 < 10) {
      shorted = Math.round(v / 1000 * 10) / 10 + 'K';
    } else {
      shorted = Math.round(v / 1000) + 'K';
    }
  } else {
    shorted = Math.round(v);
  }
  return shorted;
};

export class Ticker {

  averageVolume;
  averageVolumeAsString = '';
  chart;
  chartData = {};
  chartElement;
  chartContainer;
  closePrice = 0;
  config;
  levels = {};
  highs;
  lows;
  minMove = 0.01;
  name;
  orderBook;
  precision = 2;
  price$ = new Subject();
  series;
  state;
  isTimeout = false;
  stream;
  method = {};
  updateUI$ = new Subject();
  isActive = true;
  minLevelAge;

  constructor(name, state) {
    this.name = name;
    if (state) {
      this.state = state;
    }
    this.config = new Settings(state, this);
    this.minLevelAge = this.config.minLevelAge;
  }

  getHeight = (width) => {
    let height = width * 0.7;
    const favoritesHeight = this.state?.favoritesHeight || 0;
    if (height + 12 + 32 + favoritesHeight > window.innerHeight) {
      height = window.innerHeight - 12 - 32 - favoritesHeight;
    }
    return height;
  };

  createChart = (chartElement) => {
    if (!this.chartElement) {
      this.chartElement = chartElement;
    }
    if (!this.chart && this.chartElement) {
      const width = (this.state.width || 400) - 2;
      const height = this.getHeight(width);
      this.chart = createChartFn(this.chartElement, {width, height});
    }
    if (!this.series && this.chart) {
      this.series = this.chart.addCandlestickSeries();
      if (this.chartData[m5]) {
        this.setChartData();
      } else {
        this.getChartData(m5);
      }
    }
  };

  updateChart = (callback) => {
    setTimeout(() => {
      if (this.chart) {
        const width = (this.state.width || 400) - 2;
        const height = this.getHeight(width);
        this.chart.resize(width, height);
        this.setChartOptions();
        callback?.();
      }
    });
  };

  disable = (updateConfig = true) => {
    if (this.state.config.tickers[this.name]) {
      this.state.config.tickers[this.name].isActive = false;
      this.isActive = false;
      this.config?.disable();
      this.closeStream();
      this.orderBook?.remove();
      this.price$.complete();
      this.updateUI$.complete();
      this.chart?.timeScale().unsubscribeVisibleTimeRangeChange(this.onVisibleTimeRangeChanged);
      if (updateConfig) {
        this.state?.config?.save?.();
        this.state?.updateTickers?.();
      }
    }
  };

  enableTimeout = () => {
    this.isTimeout = true;
    this.orderBook?.enableTimeout();
    setTimeout(() => {
      this.isTimeout = false;
    }, (this.config.notificationTimeout || 5) * 1000 * 60);
  };

  enableChart = (enable = true) => {
    this.chart?.applyOptions({
      handleScroll: enable,
      handleScale: enable,
    });
  };

  getChartData = (interval) => {
    if (this.state?.apiTimeout) {
      this.state.onError(() => this.getChartData(interval), '');
    } else {
      getSymbolChartData(this.name, interval, chartLimit[interval])
        .then((data) => {
          if (data.length) {
            const map = {};
            const array = [];
            data.forEach((bar) => {
              const candle = new Bar(bar);
              candle.i = array.push(candle) - 1;
              map[candle.time] = candle;
              this.setPrecision(candle);
            });
            this.chartData[interval] = {map, array};
            if (interval === m5) {
              this.setChartData();
              this.setAverageVolume();
              if (!this.orderBook) {
                this.orderBook = new OrderBook(this);
              }
              this.updateUI$.next(this);
            }
          }
          if (nextInterval[interval]) {
            this.getChartData(nextInterval[interval]);
          } else {
            this.updateLevels(true);
          }
        })
        .catch(() => {
          this.state?.onError(() => this.getChartData(interval), '');
        });
    }
  };

  openStream = () => {
    if (!this.stream) {
      try {
        const streamNames = [];
        Object.keys(methods).forEach((name) => {
          const streamName = this.name.toLowerCase() + methods[name];
          streamNames.push(this.name.toLowerCase() + methods[name]);
          this.method[streamName] = name;
        });
        this.stream = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streamNames.join('/')}`);
        this.stream.addEventListener('message', this.onStreamMessage);
        this.stream.addEventListener('error', this.onStreamError);
      } catch (e) {
        this.onStreamError(e);
      }
    }
  };

  closeStream = () => {
    this.stream?.removeEventListener('message', this.onStreamMessage);
    this.stream?.removeEventListener('error', this.onStreamError);
    this.stream?.close();
    delete this.stream;
  };

  onStreamMessage = (e) => {
    if (e.data) {
      const data = JSON.parse(e.data);
      if (data.data && data.stream && this.method[data.stream]) {
        const name = this.method[data.stream];
        if (this[name]) {
          this[name](data.data);
        }
      }
    }
  };

  onStreamError = (e) => {
    console.log(this.name, e);
    this.closeStream();
    setTimeout(this.openStream, 5000);
  };

  onChart = (update) => {
    if (update?.k?.t) {
      const time = update.k.t;
      const {array, map} = this.chartData?.[M5] || {};
      if (array && map) {
        let bar;
        if (map[time]) {
          bar = map[time];
          bar.update(update.k);
        } else {
          bar = new Bar(update.k);
          map[time] = bar;
          array.push(bar);
          this.setAverageVolume();
        }
        if (this.series) {
          const {time, open, high, low, close} = bar;
          this.series.update({
            time: time / 1000,
            open,
            high,
            low,
            close,
          });
          this.price$?.next({high, low, time});
          if (!this.closePrice) {
            setTimeout(() => this.state?.dispatch(this.state));
          }
          this.closePrice = close;
          this.setAverageVolumeAsString();
        }
      }
    }
  };

  onOrderBook = (update) => {
    this.orderBook?.onOrderBookMessage(update);
  };

  onBestPrice = (update) => {
    this.orderBook?.onBestPrice(update);
  };

  setAverageVolume = () => {
    const data = this.chartData?.[m5]?.array;
    let count = this.config?.last5mCount || 10;
    if (data?.length && data.length > 1) {
      if (count + 1 > data.length) count = data.length - 1;
      const lastVolumes = data.slice(data.length - count - 1, data.length - 1)?.map((bar) => bar.volume);
      this.averageVolume = lastVolumes.reduce((acc, value) => acc + value, 0) / count;
    } else {
      this.averageVolume = 0;
    }
  };

  setAverageVolumeAsString = () => {
    let averageVolumeAsString = '';
    if (this.averageVolume) {
      averageVolumeAsString = getShorted(this.averageVolume);
      if (this.closePrice) {
        averageVolumeAsString += ` ($${getShorted(this.averageVolume * this.closePrice)})`;
      }
      this.averageVolumeAsString = averageVolumeAsString;
    }
  };

  setChartData = () => {
    if (this.series && this.chartData?.[m5]?.array) {
      this.series.setData(this.chartData[m5].array.map((bar) => ({
        time: bar.time / 1000,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })));
      this.setChartOptions();
      this.openStream();
      this.chart.timeScale().subscribeVisibleTimeRangeChange(this.onVisibleTimeRangeChanged);
    }
  };

  onVisibleTimeRangeChanged = (range) => {
    const barMap = this.chartData?.[M5]?.map;
    if (range?.from && barMap) {
      const prevBarTime = range.from * 1000 - 5 * 60 * 1000;
      const prevBar = barMap[prevBarTime];
      if (!prevBar) {
        barMap[prevBarTime] = 1; // чтоб на время запроса не генерировались новые запросы
        getSymbolChartDataByRange(this.name, M5, range.from * 1000 - 500 * 5 * 60 * 1000, range.from * 1000)
          .then((data) => {
            delete barMap[prevBarTime];
            if (data && this.series) {
              data.forEach((d) => {
                const bar = new Bar(d);
                barMap[bar.time] = bar
              });
              this.chartData[M5].array = Object.keys(barMap)
                .sort((a, b) => barMap[a].time - barMap[b].time)
                .map((time, i) => {
                  barMap[time].i = i;
                  return barMap[time];
                });
              this.series.setData(this.chartData[m5].array.map((bar) => ({
                time: bar.time / 1000,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
              })));
            }
          })
          .catch(() => {});
      }
    }
  };

  setChartOptions = () => {
    if (this.chart && this.series) {
      this.chart.timeScale().setVisibleRange({
        from: (Date.now() - 60 * 60 * 24 * 1000) / 1000,
        to: Date.now() / 1000,
      });
      this.chart.applyOptions({
        timeScale: {
          rightOffset: 20,
          timeVisible: true,
        },
      });
      this.series.applyOptions({
        priceFormat: {
          precision: this.precision,
          minMove: this.minMove,
        },
      });
    }
  };

  updateLevels = (force = false) => {
    if (
      (
        this.config?.minLevelAge !== undefined &&
        this.minLevelAge !== this.config.minLevelAge
      ) || force
    ) {
      this.minLevelAge = this.config.minLevelAge;
      Object.keys(this.levels).forEach((price) => {
        this.levels[price].destroy();
      });
      this.setExtremes(h1);
      this.setExtremes(d1);
    }
  };

  setExtremes = (interval) => {
    const timeDelta = {
      [H1]: 60 * 60 * 1000 * 5,
      [D1]: 60 * 60 * 1000 * 24 * 10
    };
    const data = this.chartData?.[interval]?.array;
    const minLevelAge = this.config?.minLevelAge || 1;
    const minLevelAgeTime = Date.now() - minLevelAge * 1000 * 60 * 60;
    const series = this.series;
    if (data?.length && series) {
      const current = {high: {price: null, time: null, i: null}, low: {price: null, time: null, i: null}};
      const prev = {high: {price: null, time: null}, low: {price: null, time: null}};
      const highs = [];
      const lows = [];
      let highAdded = false;
      let lowAdded = false;
      const lastIndex = data.length - 1;
      for (let i = lastIndex; i >= 0; i--) {
        const {high, low, time} = data[i];
        if (i === lastIndex) {
          current.high = {price: high, time, i};
          current.low = {price: low, time, i};
        } else {
          if (high > current.high.price) {
            current.high = {price: high, time, i};
            highAdded = false;
          } else if (
            !highAdded &&
            current.high.i !== lastIndex &&
            high < current.high.price &&
            current.high.time < minLevelAgeTime
          ) {
            if (prev.high.time && prev.high.time - timeDelta[interval] < current.high.time) {
              highs.pop();
            }
            prev.high = {...current.high};
            highs.push({...current.high});
            highAdded = true;
          }
          if (low < current.low.price) {
            current.low = {price: low, time, i};
            lowAdded = false;
          } else if (
            !lowAdded &&
            current.low.i !== lastIndex &&
            low > current.low.price &&
            current.low.time < minLevelAgeTime
          ) {
            if (prev.low.time && prev.low.time - timeDelta[interval] < current.low.time) {
              lows.pop();
            }
            prev.low = {...current.low};
            lows.push({...current.low});
            lowAdded = true;
          }
        }
      }
      highs.forEach((high) => {
        new Level({
          interval,
          price: high.price,
          side: HIGH,
          ticker: this,
          time: high.time,
        });
      });
      lows.forEach((low) => {
        new Level({
          interval,
          price: low.price,
          side: LOW,
          ticker: this,
          time: low.time,
        });
      });
    }
  };

  setPrecision = (bar) => {
    barPrices.forEach((name) => {
      if (bar[name]) {
        const fraction = String(bar[name]).split('.')[1];
        if (fraction) {
          if (fraction.length > this.precision) {
            this.precision = fraction.length;
            this.minMove = Number(`0.${'0'.repeat(this.precision - 1)}1`);
          }
        }
      }
    });
  };

}
