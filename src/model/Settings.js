import {bannedTimout, checkedTimout, last5mCount, minLevelAge, minOrderPercentage, orderTimeout, priceDistance, removeOrderPercentage, removeTimeout} from '../config';

export class Settings {

  bannedTimout;
  checkedTimout;
  last5mCount;
  minLevelAge;
  minOrderPercentage;
  orderTimeout;
  priceDistance;
  removeOrderPercentage;
  removeTimeout;
  state;
  ticker; // string
  tickers; // {name: string, active: boolean}

  constructor(state, ticker) {
    this.state = state;
    if (ticker) this.ticker = ticker;
    this.setConfig(ticker);
  }

  setConfig = (ticker) => {
    let config;
    const configJson = localStorage.getItem(ticker ?? 'config')
    if (configJson) {
      config = JSON.parse(configJson);
    } else if (ticker && this.state.config) {
      config = {};
      Object.keys(this.state.config).forEach((name) => {
        if (
          name !== 'tickers' &&
          this.state.config[name] !== undefined &&
          typeof this.state.config[name] !== 'function'
        ) {
          config[name] = this.state.config[name];
        }
      });
      if (!Object.keys(config).length) config = undefined;
    }
    if (!config) {
      config = {
        bannedTimout,
        checkedTimout,
        last5mCount,
        minLevelAge,
        minOrderPercentage,
        orderTimeout,
        priceDistance,
        removeOrderPercentage,
        removeTimeout
      };
    }
    Object.keys(config).forEach((k) => {
      this[k] = config[k];
    });
  };

  save = () => {
    const config = {};
    Object.keys(this)
      .forEach((name) => {
        if (
          name !== 'state' &&
          this[name] !== undefined &&
          typeof this[name] !== 'function'
        ) {
          config[name] = this[name];
        }
      });
    localStorage.setItem(this.ticker ?? 'config', JSON.stringify(config));
  };

  update = (config) => {
    Object.keys(config)
      .forEach((name) => {
        if (
          name !== 'state' &&
          config[name] !== undefined &&
          typeof config[name] !== 'function'
        ) {
          this[name] = config[name];
        }
      });
    this.save();
  };

}
