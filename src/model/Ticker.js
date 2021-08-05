import {OrderBook} from './OrderBook';
import {createChart} from 'lightweight-charts';
import {getSymbolChartData} from '../api';
import {chartLimit, d1, h1, m5} from '../config';
import {Bar} from './Bar';
import {Settings} from './Settings';
import {BehaviorSubject} from 'rxjs';
import {barPrices, HIGH, LOW} from '../constants';
import {Level} from './Level';

const nextInterval = {
  [m5]: h1,
  [h1]: d1,
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
  price$ = new BehaviorSubject(null);
  series;
  state;
  isTimeout = false;

  constructor(name, state) {
    this.name = name;
    if (state) {
      this.state = state;
    }
    this.config = new Settings(state, this.name);
  }

  closeStream = () => {
    this.chartStream?.removeEventListener('message', this.onChartStreamMessage);
    this.chartStream?.close();
  };

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
      this.orderBook = new OrderBook(this);
    }
  };

  disable = () => {
    if (this.state.config.tickers[this.name]) {
      this.state.config.tickers[this.name].isActive = false;
      this.config?.configSubscription?.unsubscribe();
      this.closeStream();
      this.orderBook?.remove();
      this.price$.next(-1);
      this.state?.config?.save?.();
      this.state?.updateTickers?.();
    }
  };

  enableTimeout = () => {
    this.isTimeout = true;
    this.orderBook?.enableTimeout();
    setTimeout(() => {
      this.isTimeout = false;
    }, (this.config.notificationTimeout || 5) * 1000 * 60);
  };

  getChartData = (interval) => {
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
          }
        }
        if (nextInterval[interval]) {
          this.getChartData(nextInterval[interval]);
        } else {
          this.setExtremes(h1);
          this.setExtremes(d1);
        }
      });
  };

  onChartStreamMessage = (e) => {
    if (e.data) {
      const update = JSON.parse(e.data);
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
          if (!this.isTimeout) {
            this.price$?.next({high, low, time});
          }
        }
      }
    }
  };

  openChartStream = () => {
    if (!this.chartStream) {
      this.chartStream = new WebSocket(`wss://stream.binance.com:9443/ws/${this.name.toLowerCase()}@kline_5m`);
      this.chartStream.onmessage = this.onChartStreamMessage;
    }
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
      this.openChartStream();
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
