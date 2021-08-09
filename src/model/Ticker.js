import {OrderBook} from './OrderBook';
import {createChart} from 'lightweight-charts';
import {getSymbolChartData} from '../api';
import {apiTimeout, chartLimit, d1, h1, m5} from '../config';
import {Bar} from './Bar';
import {Settings} from './Settings';
import {Subject} from 'rxjs';
import {barPrices, HIGH, LOW} from '../constants';
import {Level} from './Level';

const nextInterval = {
  [m5]: h1,
  [h1]: d1,
};

const methods = {
  onOrderBook: '@depth@1000ms',
  onChart: '@kline_5m',
  onBestPrice: '@bookTicker'
};

export class Ticker {

  averageVolume;
  chart;
  chartData = {};
  chartElement;
  chartStream;
  config;
  levels = {};
  highs;
  lows;
  minMove = 0.01;
  name;
  orderBook;
  precision = 2;
  price;
  price$ = new Subject();
  series;
  state;
  isTimeout = false;
  stream;
  stream$ = {
    orderBook: new Subject(),
    chart: new Subject(),
    bestPrice: new Subject()
  }
  methodMap = {};
  chartSubscription;
  updateUI$ = new Subject();
  isActive = true;

  constructor(name, state) {
    this.name = name;
    if (state) {
      this.state = state;
    }
    this.config = new Settings(state, this.name);
  }

  createChart = (chartElement) => {
    if (!this.chartElement) {
      this.chartElement = chartElement;
    }
    if (!this.chart && this.chartElement) {
      this.chart = createChart(this.chartElement, {width: 580, height: 465});
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

  disable = (updateConfig = true) => {
    if (this.state.config.tickers[this.name]) {
      this.state.config.tickers[this.name].isActive = false;
      this.isActive = false;
      this.config?.disable();
      this.closeStream();
      this.orderBook?.remove();
      this.price$.complete();
      this.updateUI$.complete();
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
      handleScale: enable
    });
  };

  getChartData = (interval) => {
    if (this.state.apiTimeout) {
      setTimeout(() => {
        this.getChartData(interval);
      }, 1000 * 60 * apiTimeout + 100);
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
              const lastIndex = this.chartData[m5].array.length - 1;
              this.price = this.chartData[m5].array[lastIndex].close;
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
            this.setExtremes(h1);
            this.setExtremes(d1);
          }
        })
        .catch((e) => {
          this.state.apiTimeout = true;
          this.getChartData(interval);
          setTimeout(() => {
            this.state.apiTimeout = false;
          }, 1000 * 60 * apiTimeout);
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
          this.methodMap[streamName] = name;
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
      if (data.data && data.stream && this.methodMap[data.stream]) {
        const methodName = this.methodMap[data.stream];
        if (methodName) {
          this[methodName]?.(data.data);
        }
      }
    }
  }

  onStreamError = (e) => {
    console.log(this.name, e);
    this.closeStream();
    setTimeout(this.openStream, 5000);
  }

  onChart = (update) => {
    if (update) {
      if (update?.k?.t && update?.k?.o && update?.k?.h && update?.k?.l && update?.k?.c && update?.k?.v) {
        const bar = new Bar(update.k);
        this.price = bar.close;
        const {array, map} = this.chartData?.[m5] || {};
        if (!map[bar.time]) {
          bar.i = array.push(bar) - 1;
          this.setAverageVolume();
        }
        map[bar.time] = bar;
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
        }
      }
    }
  };

  onOrderBook = (update) => {
    this.orderBook.onOrderBookMessage(update);
  };

  onBestPrice = (update) => {
    this.orderBook.onBestPrice(update);
  };

  setAverageVolume = () => {
    const data = this.chartData?.[m5]?.array;
    let count = this.config?.last5mCount || 10;
    if (data?.length) {
      if (count + 1 > data.length) count = data.length - 1;
      if (count && count > 0) {
        const last5m = data.slice(data.length - count - 1, data.length - 1)?.map((bar) => bar.volume);
        this.averageVolume = last5m.reduce((acc, value) => acc + value, 0) / count;
      }
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
      this.chart.timeScale().setVisibleRange({
        from: (Date.now() - 60 * 60 * 12 * 1000) / 1000,
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
      this.openStream();
      // this.openChartStream();
    }
  };

  setExtremes = (interval) => {
    const data = this.chartData?.[interval]?.array;
    const series = this.series;
    if (data?.length && series) {
      let currentHigh = [0, 0];
      let currentLow = [0, 0];
      let highCreated = false;
      let lowCreated = false;
      for (let i = data.length - 1; i >= 0; i--) {
        const {high, low, time} = data[i];
        if (i === data.length - 1) {
          currentHigh = [high, time];
          currentLow = [low, time];
        } else {
          if (high > currentHigh[0]) {
            currentHigh = [high, time];
            highCreated = false;
          } else if (high < currentHigh[0] && !highCreated) {
            new Level({
              interval,
              price: currentHigh[0],
              side: HIGH,
              ticker: this,
              time: currentHigh[1],
            });
            highCreated = true;
          }
          if (low < currentLow[0]) {
            currentLow = [low, time];
            lowCreated = false;
          } else if (low > currentLow[0] && !lowCreated) {
            new Level({
              interval,
              price: currentLow[0],
              side: LOW,
              ticker: this,
              time: currentLow[1],
            });
            lowCreated = true;
          }
        }
      }
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
