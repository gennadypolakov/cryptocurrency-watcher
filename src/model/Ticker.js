import {OrderBook} from './OrderBook';
import {createChart as createChartFn, CrosshairMode} from 'lightweight-charts';
import {getSymbolChartData, getSymbolChartDataByRange} from '../api';
import {chartLimit, chartRightOffset, intervals, volumeViewedTimeout} from '../config';
import {Bar} from './Bar';
import {Settings} from './Settings';
import {Subject} from 'rxjs';
import {barPrices, btcusdt, D1, H1, H4, HIGH, intervalDuration, LOW, M5} from '../constants';
import {Level} from './Level';

const nextInterval = {
  [M5]: H1,
  [H1]: H4,
  [H4]: D1
};

const methods = {
  onOrderBook: '@depth@1000ms',
  onChart: '@kline_5m',
  onBestPrice: '@bookTicker',
};

const getChartMethods = (name, methods) => {
  return intervals.slice(1).reduce((acc, current) => {
    const method = `onChart${current}`;
    const stream = `${name.toLowerCase()}@kline_${current}`;
    acc[current] = {method, stream};
    methods[stream] = method;
    return acc;
  }, {});
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
  volume = {
    average: 0,
    sum: 0,
    time: 0,
    timeoutId: null
  };
  highVolume = 0;
  volumeViewed = false;
  volumeViewedTimeoutId;
  interval = M5;
  chartMethods;
  openedHigherIntervalStreams = {};
  subscribedOnVisibleTimeRangeChange;
  streamRequestId = 0;
  streamOpened = false;

  constructor(name, state) {
    this.name = name;
    this.chartMethods = getChartMethods(name, this.method);
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
      this.chart.applyOptions({crosshair: {mode: CrosshairMode.Normal}});
    }
    if (!this.series && this.chart) {
      this.series = this.chart.addCandlestickSeries();
      if (this.chartData[M5]) {
        this.setChartData();
      } else {
        this.getChartData(M5);
      }
    }
  };

  updateChart = (callback) => {
    setTimeout(() => {
      if (this.chart) {
        const width = (this.state.width || 400) - 2;
        const height = this.getHeight(width);
        this.chart.resize(width, height);
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
              const candle = new Bar(bar, interval);
              candle.i = array.push(candle) - 1;
              map[candle.time] = candle;
              this.setPrecision(candle);
            });
            if (data.length < chartLimit[interval]) {
              array[0].isFirst = true;
            }
            this.chartData[interval] = {map, array};
            if (interval === M5) {
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
        // if (this.name === 'WAVESUSDT') {
        //   this.method['btcusdt@aggTrade'] = 'onAggTrade';
        //   streamNames.push('btcusdt@aggTrade');
        //   this.method['wavesusdt@trade'] = 'onTrade';
        //   streamNames.push('wavesusdt@trade');
        // }
        this.stream = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streamNames.join('/')}`);
        this.stream.addEventListener('open', this.onOpenStream);
        this.stream.addEventListener('error', this.onStreamError);
        this.stream.addEventListener('error', this.onStreamError);
      } catch (e) {
        this.onStreamError(e);
      }
    }
  };

  closeStream = () => {
    this.stream?.removeEventListener('message', this.onStreamMessage);
    this.stream?.removeEventListener('error', this.onStreamError);
    this.stream?.removeEventListener('open', this.onOpenStream);
    this.stream?.close();
    delete this.stream;
  };

  onOpenStream = (e) => {
    this.streamOpened = true;
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

  onChart1h = (update) => {
    this.onHigherIntervalChart(update, H1);
  };

  onChart4h = (update) => {
    this.onHigherIntervalChart(update, H4);
  };

  onChart1d = (update) => {
    this.onHigherIntervalChart(update, D1);
  };

  onHigherIntervalChart = (update, interval) => {
    if (update?.k?.t) {
      const time = update.k.t;
      const {array, map} = this.chartData?.[interval] || {};
      if (array && map) {
        let bar;
        if (map[time]) {
          bar = map[time];
          bar.update(update.k);
        } else {
          bar = new Bar(update.k);
          map[time] = bar;
          array.push(bar);
        }
        if (this.series && this.interval === interval) {
          const {time, open, high, low, close} = bar;
          this.series.update({
            time: time / 1000,
            open,
            high,
            low,
            close,
          });
        }
      }
    }
  };

  onChart = (update) => {
    if (update?.k?.t) {
      const time = update.k.t;
      const {array, map} = this.chartData?.[M5] || {};
      if (array && map) {
        let bar;
        if (map[time]) {
          bar = map[time];
          this.volume.sum -= bar.volume;
          bar.update(update.k);
          this.volume.sum += bar.volume;
          if (bar.volume > this.volume.average * (this.config?.averageVolumeMultiplier || 1)) {
            this.highVolume = bar.volume;
            if (
              this.config.highVolumeNotifications &&
              !this.state.btcHighVolume &&
              !this.isTimeout &&
              bar.time !== this.volume.time &&
              !this.volumeViewed
            ) {
              this.volume.time = bar.time;
              this.state.events$.next(this);
              if (!this.volume.timeoutId) {
                this.volume.timeoutId = setTimeout(() => {
                  this.volumeViewed = false;
                  this.volume.timeoutId = null;
                }, 60 * 1000 * volumeViewedTimeout);
              }
            }
          } else {
            this.highVolume = 0;
            this.state?.removeEvent(this.name, 'volume');
          }
          if (this.name === btcusdt) {
            this.state.btcHighVolume = this.highVolume;
          }
        } else {
          this.volume.average = this.volume.sum / array.length;
          bar = new Bar(update.k);
          this.volume.sum += bar.volume;
          map[time] = bar;
          array.push(bar);
          this.setAverageVolume();
        }
        if (this.series) {
          const {time, open, high, low, close} = bar;
          if (this.interval === M5) {
            this.series.update({
              time: time / 1000,
              open,
              high,
              low,
              close,
            });
          }
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
    const data = this.chartData?.[M5]?.array;
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

  getVolumes = () => {
    const volumes = {};
    if (this.volume.average) {
      volumes.average = getShorted(this.volume.average);
      if (this.closePrice) {
        volumes.average += ` ($${getShorted(this.volume.average * this.closePrice)})`;
      }
    }
    if (this.highVolume) {
      volumes.highVolume = getShorted(this.highVolume);
      if (this.closePrice) {
        volumes.highVolume += ` ($${getShorted(this.highVolume * this.closePrice)})`;
      }
    }
    return volumes;
  };

  addStream = (interval) => {
    if (this.stream && this.streamOpened && !this.openedHigherIntervalStreams[interval]) {
      this.openedHigherIntervalStreams[interval] = true;
      const id = ++this.streamRequestId;
      this.stream.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: [this.chartMethods[interval].stream],
        id
      }));
    }
  };

  removeStream = (interval) => {
    if (this.stream && this.streamOpened && this.openedHigherIntervalStreams[interval]) {
      const id = ++this.streamRequestId;
      this.stream.send(JSON.stringify({
        method: 'UNSUBSCRIBE',
        params: [this.chartMethods[interval].stream],
        id
      }));
      delete this.openedHigherIntervalStreams[interval];
    }
  };

  setInterval = (interval) => {
    this.interval = interval;
    this.setLevels(interval);
    this.setChartData(interval);
    if (interval === M5) {
      this.removeStream(H1);
      this.removeStream(H4);
      this.removeStream(D1);
    } else if (interval === H1) {
      this.setLastChartData(interval);
      this.removeStream(H4);
      this.removeStream(D1);
      this.addStream(H1);
    } else if (interval === D1) {
      this.setLastChartData(interval);
      this.removeStream(H1);
      this.removeStream(H4);
      this.addStream(D1);
    }
  };

  setLastChartData = (interval) => {
    const chartData = this.chartData?.[interval] || {};
    const {array, map} = chartData;
    if (array && map) {
      const lastBar = array[array.length - 1];
      getSymbolChartDataByRange(this.name, interval, lastBar.time)
        .then((data) => {
          if (data) {
            data.forEach((d, i) => {
              if (i === 0) {
                lastBar.create(d);
              } else {
                const bar = new Bar(d, interval);
                map[bar.time] = bar;
                array.push(bar);
              }
            });
            this.series?.setData(array.map((bar) => ({
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
  };

  setLevels = (interval) => {
    if (this.levels && Object.keys(this.levels).length) {
      if (interval === M5) {
        Object.keys(this.levels).forEach((price) => {
          if (!this.levels[price].line) {
            this.levels[price].createLine();
          }
        });
      } else if (interval === H1) {
        Object.keys(this.levels).forEach((price) => {
          if (!this.levels[price].line) {
            this.levels[price].createLine();
          }
        });
      } else if (interval === H4) {
        Object.keys(this.levels).forEach((price) => {
          if (this.levels[price].line) {
            if (this.levels[price].interval === H1) {
              this.levels[price].removeLine();
            }
          } else {
            if ((this.levels[price].interval === H4 || this.levels[price].interval === D1) && !this.levels[price].line) {
              this.levels[price].createLine();
            }
          }
        });
      } else if (interval === D1) {
        Object.keys(this.levels).forEach((price) => {
          if ((this.levels[price].interval === H1 || this.levels[price].interval === H4) && this.levels[price].line) {
            this.levels[price].removeLine();
          }
        });
      }
    }
  };

  setChartData = (interval = M5) => {
    const data = this.chartData?.[interval]?.array;
    if (this.series && data) {
      let sum;
      if (!this.volume.sum) {
        sum = (volume) => {
          this.volume.sum += volume;
        }
      }
      this.series.setData(data.map((bar) => {
        if (sum) {
          sum(bar.volume);
        }
        return {
          time: bar.time / 1000,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        };
      }));
      if (interval === M5) {
        this.volume.average = this.volume.sum / data.length;
      }
      this.setChartOptions(interval);
      this.openStream();
      if (!this.subscribedOnVisibleTimeRangeChange) {
        this.subscribedOnVisibleTimeRangeChange = true;
        this.chart.timeScale().subscribeVisibleTimeRangeChange(this.onVisibleTimeRangeChanged);
      }
    }
  };

  onVisibleTimeRangeChanged = (range) => {
    const {array, map} = this.chartData?.[this.interval] || {};
    if (!array?.[0]?.isFirst && range?.from && map) {
      const prevBarTime = range.from * 1000 - intervalDuration[this.interval];
      const prevBar = map[prevBarTime];
      if (!prevBar) {
        const historyLength = 500;
        map[prevBarTime] = 1; // чтоб на время запроса не генерировались новые запросы
        getSymbolChartDataByRange(this.name, this.interval, range.from * 1000 - historyLength * intervalDuration[this.interval], range.from * 1000)
          .then((data) => {
            delete map[prevBarTime];
            if (data && this.series) {
              data.forEach((d) => {
                const bar = new Bar(d, this.interval);
                map[bar.time] = bar
              });
              this.chartData[this.interval].array = Object.keys(map)
                .sort((a, b) => map[a].time - map[b].time)
                .map((time, i) => {
                  map[time].i = i;
                  return map[time];
                });
              if (data.length < historyLength) {
                this.chartData[this.interval].array[0].isFirst = true;
              }
              this.series.setData(this.chartData[this.interval].array.map((bar) => ({
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

  getDefaultVisibleRange = (interval) => {
    const to = Date.now() / 1000;
    const currentInterval = (interval && intervalDuration[interval] ? intervalDuration[interval] : intervalDuration[M5]) / 1000;
    return {from: to - 250 * currentInterval, to};
  };

  firstTime = {};

  setChartOptions = (interval = M5) => {
    if (!this.firstTime[interval]) {
      this.firstTime[interval] = true;
      if (this.chart && this.series) {
        this.chart.timeScale().setVisibleRange(this.getDefaultVisibleRange(interval));
        this.chart.applyOptions({
          timeScale: {
            rightOffset: chartRightOffset,
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
      this.setExtremes(H1);
      this.setExtremes(H4);
      this.setExtremes(D1);
    }
  };

  setExtremes = (interval) => {
    const intervalDelta = {
      [H1]: this.config.hourlyDelta,
      [H4]: this.config.fourHoursDelta,
      [D1]: this.config.dailyDelta
    };
    const indexDelta = intervalDelta[interval];
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
            if (prev.high.i && prev.high.i < current.high.i + indexDelta) {
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
            if (prev.low.i && prev.low.i < current.low.i + indexDelta) {
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
