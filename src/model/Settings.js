import {
  autoScroll,
  autoScrollTimeout,
  averageVolumeMultiplier,
  checkedTimout,
  columnCount, dailyDelta, hourlyDelta,
  last5mCount,
  minLevelAge,
  minOrderPercentage,
  notificationTimeout,
  orderTimeout,
  priceDistance,
  removeOrderPercentage,
  removeTimeout,
} from '../config';
import {Subject} from 'rxjs';

export const defaultConfig = {
  autoScroll,
  autoScrollTimeout,
  averageVolumeMultiplier,
  checkedTimout,
  columnCount,
  dailyDelta,
  hourlyDelta,
  last5mCount,
  minLevelAge,
  minOrderPercentage,
  notificationTimeout,
  orderTimeout,
  priceDistance,
  removeOrderPercentage,
  removeTimeout
};

export class Settings {

  map = {...defaultConfig};
  commonConfigSubscription;
  isDefault = true;
  state;
  ticker; // string
  tickers; // {name: string, active: boolean}

  config$;

  get autoScroll() {
    return this.map.autoScroll;
  };
  set autoScroll(v){
    this.map.autoScroll = v;
  };

  get autoScrollTimeout() {
    return this.map.autoScrollTimeout;
  };
  set autoScrollTimeout(v){
    this.map.autoScrollTimeout = v;
  };

  get averageVolumeMultiplier() {
    return this.map.averageVolumeMultiplier;
  };
  set averageVolumeMultiplier(v){
    this.map.averageVolumeMultiplier = v;
  };

  get notificationTimeout() {
    return this.map.notificationTimeout;
  };
  set notificationTimeout(v){
    this.map.notificationTimeout = v;
  };

  get checkedTimout() {
    return this.map.checkedTimout;
  };
  set checkedTimout(v){
    this.map.checkedTimout = v;
  };

  get columnCount() {
    return this.map.columnCount;
  };
  set columnCount(v){
    this.map.columnCount = v;
  };

  get last5mCount() {
    return this.map.last5mCount;
  };
  set last5mCount(v){
    this.map.last5mCount = v;
  };

  get minLevelAge() {
    return this.map.minLevelAge;
  };
  set minLevelAge(v){
    this.map.minLevelAge = v;
  };

  get minOrderPercentage() {
    return this.map.minOrderPercentage;
  };
  set minOrderPercentage(v){
    this.map.minOrderPercentage = v;
  };

  get orderTimeout() {
    return this.map.orderTimeout;
  };
  set orderTimeout(v){
    this.map.orderTimeout = v;
  };

  get priceDistance() {
    return this.map.priceDistance;
  };
  set priceDistance(v){
    this.map.priceDistance = v;
  };

  get removeOrderPercentage() {
    return this.map.removeOrderPercentage;
  };
  set removeOrderPercentage(v){
    this.map.removeOrderPercentage = v;
  };

  get removeTimeout() {
    return this.map.removeTimeout;
  };
  set removeTimeout(v){
    this.map.removeTimeout = v;
  };

  get dailyDelta() {
    return this.map.dailyDelta;
  };
  set dailyDelta(v){
    this.map.dailyDelta = v;
  };

  get hourlyDelta() {
    return this.map.hourlyDelta;
  };
  set hourlyDelta(v){
    this.map.hourlyDelta = v;
  };


  constructor(state, ticker) {
    this.state = state;
    if (ticker) {
      this.ticker = ticker;
      this.commonConfigSubscription = this.state?.config?.config$?.subscribe(this.updateStream);
    } else {
      this.tickers = JSON.parse(localStorage.getItem('tickers')) || {};
    }
    this.config$ = new Subject();
    this.setConfig(ticker?.name);
  }

  disable = () => {
    this.commonConfigSubscription?.unsubscribe();
    this.config$.complete();
  }

  reset = () => {
    localStorage.removeItem(this.ticker?.name || 'config');
    if (this.ticker) {
      this.map = {...this.state.config.map};
    } else {
      this.map = {...defaultConfig};
    }
    this.config$?.next({
      ...this.map,
      action: this.ticker?.name || 'reset'
    });
  };

  setConfig = (ticker) => {
    const configJson = localStorage.getItem(ticker || 'config')
    if (configJson) {
      this.isDefault = false;
      this.map = JSON.parse(configJson);
      if (!this.columnCount) {
        this.columnCount = columnCount;
        this.save();
      }
      if (!this.averageVolumeMultiplier) {
        this.averageVolumeMultiplier = averageVolumeMultiplier;
        this.save();
      }
      if (!this.hourlyDelta) {
        this.hourlyDelta = hourlyDelta;
        this.save();
      }
      if (!this.dailyDelta) {
        this.dailyDelta = dailyDelta;
        this.save();
      }
      if (this.autoScroll === undefined) {
        this.autoScroll = autoScroll;
        this.save();
      }
      if (!this.autoScrollTimeout) {
        this.autoScrollTimeout = autoScrollTimeout;
        this.save();
      }
    } else if (ticker) {
      this.map = {...this.state.config.map};
    }
  };

  save = () => {
    localStorage.setItem(this.ticker?.name || 'config', JSON.stringify(this.map));
    if (this.tickers) {
      localStorage.setItem('tickers', JSON.stringify(this.tickers));
    }
  };

  update = (config) => {
    if (config) {
      const {action, updateChart, ...rest} = config;
      const streamValue = {...rest};
      if (this.ticker) {
        if (updateChart) {
          this.ticker?.updateChart();
        }
        const savedConfig = localStorage.getItem(this.ticker.name);
        if (!action || (action && !savedConfig)) {
          this.ticker.updateLevels();
          streamValue.action = this.ticker.name;
          this.map = rest;
          this.config$?.next(streamValue);
        }
      } else {
        const updateChart = config.columnCount && this.columnCount !== config.columnCount;
        if (updateChart) {
          this.state.width = (this.state.clientWidth - 12 * config.columnCount) / config.columnCount;
        }
        this.map = rest;
        this.config$?.next({
          ...streamValue,
          action: 'update',
          updateChart
        });
      }
      if (!action) {
        this.save();
      }
      this.state?.dispatch?.(this.state);
    }
  };

  updateStream = (config) => {
    if (config) {
      const action = config.action;
      if (action) {
        setTimeout(() => {
          this[action]?.(config);
        });
      }
    }
  };

  setTickerState(name, isActive) {
    if (this.tickers?.[name]) {
      this.tickers[name].isActive = isActive;
    }
    if (this.state?.tickers?.[name]) {
      this.state.tickers[name].isActive = isActive;
    }
  }

}
