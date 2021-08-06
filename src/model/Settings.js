import {
  checkedTimout,
  last5mCount,
  minLevelAge,
  minOrderPercentage,
  notificationTimeout,
  orderTimeout,
  priceDistance,
  removeOrderPercentage,
  removeTimeout
} from '../config';
import {BehaviorSubject} from 'rxjs';

export const defaultConfig = {
  checkedTimout,
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
  configSubscription;
  isDefault = true;
  state;
  ticker; // string
  tickers; // {name: string, active: boolean}

  config$;

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


  constructor(state, ticker) {
    this.state = state;
    if (ticker) {
      this.ticker = ticker;
      this.configSubscription = this.state?.config?.config$?.subscribe(this.updateStream);
    } else {
      this.tickers = JSON.parse(localStorage.getItem('tickers')) || {};
    }
    this.config$ = new BehaviorSubject(null);
    this.setConfig(ticker);
  }

  reset = () => {
    localStorage.removeItem(this.ticker || 'config');
    if (this.ticker) {
      this.map = {...this.state.config.map};
    } else {
      this.map = {...defaultConfig};
    }
    this.config$?.next({
      ...this.map,
      action: this.ticker || 'reset'
    });
  };

  setConfig = (ticker) => {
    const configJson = localStorage.getItem(ticker || 'config')
    if (configJson) {
      this.isDefault = false;
      this.map = JSON.parse(configJson);
    } else if (ticker) {
      this.map = {...this.state.config.map};
    }
  };

  save = () => {
    localStorage.setItem(this.ticker || 'config', JSON.stringify(this.map));
    if (this.tickers) {
      localStorage.setItem('tickers', JSON.stringify(this.tickers));
    }
  };

  update = (config) => {
    if (config) {
      const {action, ...rest} = config;
      this.map = rest;
      if (!action) this.save();
      const streamValue = {...rest};
      if (this.ticker) {
        streamValue.action = this.ticker;
      } else {
        streamValue.action = 'update';
      }
      this.config$?.next(streamValue);
    }
  };

  updateStream = (config) => {
    if (config) {
      const action = config.action;
      if (action) this[action]?.(config);
    }
  };

}
