import {OrderBook} from './OrderBook';
import {createChart} from 'lightweight-charts';
import {getSymbolChartData} from '../api';
import {chartLimit, d1, h1, m5, orderTimeout} from '../config';
import {Bar} from './Bar';
import {Highs} from './Highs';
import {Lows} from './Lows';

const nextInterval = {
  [m5]: h1,
  [h1]: d1
};

export class Ticker {

  averageVolume;
  chart;
  chartData = {};
  chartElement;
  chartStream;
  highs;
  lows;
  name;
  orderBook;
  orderTimeout = orderTimeout;
  precision;
  price;
  series;
  state;

  constructor(name, state) {
    this.name = name;
    if (state) {
      this.state = state;
      this.precision = this.futures?.[name]?.pricePrecision;
    }
  }

  createChart = (chartElement) => {
    if (!this.chartElement) {
      this.chartElement = chartElement;
    }
    if (!this.chart && this.chartElement) {
      this.chart = createChart(this.chartElement, { width: 580, height: 465 });
    }
    if (!this.series && this.chart) {
      this.series = this.chart.addCandlestickSeries();
      if (this.chartData[m5]) {
        this.setChartData();
      } else {
        this.getChartData(m5);
      }
      this.highs = new Highs(this.name, this.series, this.state);
      this.lows = new Lows(this.name, this.series, this.state);
      this.orderBook = new OrderBook(this);
    }
  }

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
  }

  setChartData = () => {
    if (this.series && this.chartData?.[m5]?.array) {
      this.series.setData(this.chartData[m5].array.map((bar) => ({
        time: bar.time / 1000,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close
      })));
      this.chart.timeScale().setVisibleRange({
        from: (Date.now() - 60 * 60 * 12 * 1000) / 1000,
        to: Date.now() / 1000,
      });
      this.chart.applyOptions({
        timeScale: {
          rightOffset: 10,
          timeVisible: true
        }
      });
      if (this.precision) {
        this.series.applyOptions({priceFormat: {
          precision: 4,
          // precision: this.precision,
          minMove: 0.0001
        }});
      }
      this.openChartStream();
    }
  }

  openChartStream = () => {
    if (!this.chartStream) {
      this.chartStream = new WebSocket(`wss://stream.binance.com:9443/ws/${this.name.toLowerCase()}@kline_5m`);
      this.chartStream.onmessage = this.onChartStreamMessage;
    }
  }

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
            close
          });
          this.highs?.check?.(high, time);
          this.lows?.check?.(low, time);
        }
      }
    }
  }

  setAverageVolume = () => {
    const data = this.chartData?.[m5]?.array;
    if (data?.length && data.length > 20) {
      const last4 = data.slice(data.length - 21, data.length - 1)?.map((bar) => bar.volume);
      this.averageVolume = last4.reduce((acc, value) => acc + value, 0) / last4.length;
    }
  }

  setExtremes = (interval) => {
    const data = this.chartData?.[interval]?.array;
    const series = this.series;
    if (data?.length && series) {
      let currentHigh = [0, 0];
      let currentLow = [0, 0];
      let highCreated = false;
      let lowCreated = false;
      for(let i = data.length - 1; i >= 0; i--) {
        const {high, low, time} = data[i];
        if (i === data.length - 1) {
          currentHigh = [high, time];
          currentLow = [low, time];
        } else {
          if (high > currentHigh[0]) {
            currentHigh = [high, time];
            highCreated = false;
          } else if (high < currentHigh[0] && !highCreated) {
            this.highs.create(currentHigh[0], interval, currentHigh[1]);
            highCreated = true;
          }
          if (low < currentLow[0]) {
            currentLow = [low, time];
            lowCreated = false;
          } else if (low > currentLow[0] && !lowCreated) {
            this.lows.create(currentLow[0], interval, currentLow[1]);
            lowCreated = true;
          }
        }
      }
    }
  }

}
