import {getFuturesExchangeInfo, getManifest, getSpotExchangeInfo} from '../api';
import {Subject} from 'rxjs';
import {set} from 'lodash';

import {Ticker} from './Ticker';
import {Settings} from './Settings';
import {Level} from './Level';
import {Order} from './Order';
import {apiTimeout, languages} from '../config';
import {Button, notification} from 'antd';
import {blinkChartBorder, EN} from '../constants';

export class State {

  apiTimeout;
  banned = {}; //{name: string, checked: boolean}
  config;
  events = {};
  eventTickers;
  events$ = new Subject();
  futures;
  spot;
  tickerNames;
  tickers;
  counter = 0;
  loading = {};
  firstStart = false;
  favoritesHeight = 0;

  lang = EN;
  translation = {};

  mouseOn;
  scrolledTo;
  scrollTimeoutId;
  play = true;

  clientWidth;
  width;

  dispatch;
  version;

  btcHighVolume = 0;

  _favorites;

  get favorites() {
    if (!this._favorites) {
      this._favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    }
    return this._favorites;
  }

  set favorites(v) {
    this._favorites = v || [];
    localStorage.setItem('favorites', JSON.stringify(this._favorites));
  }

  constructor(dispatch) {
    // const v = localStorage.getItem('v');
    // if (this.version.toString() !== v) {
    //   localStorage.clear();
    //   localStorage.setItem('v', this.version.toString());
    // }
    this.dispatch = dispatch;
    this.setLanguage();
    this.setVersion();
  }

  setVersion() {
    getManifest()
      .then((data) => data?.version)
      .then((v) => {
        if (this.version && this.version !== v) {
          this.onNewVersion();
        }
        this.version = v;
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          this.setVersion();
        }, 600000);
      });
  };

  onNewVersion() {
    notification.open({
      message: 'Новая версия приложения',
      btn: (
        <Button type="primary" size="small" onClick={() => window.location.reload()}>
          Обновить
        </Button>
      )});
  }

  setLanguage = () => {
    if (navigator.language && languages[navigator.language]) {
      this.lang = languages[navigator.language];
    }
    import(`../lang/${this.lang}`).then((module) => {
      if (module.translation) {
        this.translation = module.translation;
        this.dispatch(this);
      }
    });
  };

  scrollTo = (name) => {
    const chartContainer = this.tickers?.[name]?.chartContainer;
    if (chartContainer) {
      this.scrolledTo = name;
      window.scrollTo({
        top: chartContainer.offsetTop - 5,
        behavior: 'smooth'
      });
      chartContainer.classList.add(blinkChartBorder);
      setTimeout(() => {
        chartContainer.classList.remove(blinkChartBorder);
      }, 3000);
    }
    this.removeViewedEvent(name);
  };

  getWidth = () => {
    let count = this.config?.columnCount;
    if (this.clientWidth < 600) {
      this.width = this.clientWidth - 12;
    } else if (count) {
      if ((this.clientWidth - 12 * count) / count < 400) {
        while((this.clientWidth - 12 * count) / count < 400 && count > 1) {
          count--;
        }
      }
      this.width = (this.clientWidth - 12 * count) / count;
    }
    return this.width;
  };

  init = () => {
    if (this.clientWidth) {
      if (!this.config) {
        this.config = new Settings(this);
        this.getWidth();
        if (!this.spot) {
          this.getSpot();
        }
        this.events$.subscribe(this.onEvent);
      }
    }
  };

  setWidth = (width) => {
    if (width) {
      this.clientWidth = width;
      this.init();
      this.dispatch?.(this);
    }
  };

  onEvent = (event) => {
    let tickerName;
    if (event && event.price && event.ticker?.name) {
      if (
        event instanceof Level &&
        !this.events[event.ticker.name]?.level?.[event.price]
      ) {
        set(this.events, [event.ticker.name, 'level', event.price], event);
        tickerName = event.ticker.name;
        this.dispatch?.(this);
      } else if (
        event instanceof Order &&
        !this.events[event.ticker.name]?.order?.[event.price]
      ) {
        set(this.events, [event.ticker.name, 'order', event.price], event);
        tickerName = event.ticker.name;
        this.dispatch?.(this);
      }
    } else if (
      event instanceof Ticker &&
      !this.events[event.name]?.volume
    ) {
      set(this.events, [event.name, 'volume'], event);
      tickerName = event.name;
      this.dispatch?.(this);
    }
    if (tickerName) {
      if (!this.events[tickerName]) {
        this.queue.push(tickerName);
      }
      this.scrollToNext(tickerName);
    }
  }

  queue = [];

  scrollToNext = (name) => {
    if (this.config?.autoScroll && this.scrolledTo !== this.mouseOn && this.play) {
      if (!this.scrollTimeoutId) {
        let tickerName = name;
        if (!tickerName) {
          tickerName = this.queue[0];
          this.queue = this.queue.slice(1);
          if (!tickerName && this.events) {
            tickerName = Object.keys(this.events).sort()[0];
          }
        }
        if (tickerName) {
          this.scrolledTo = tickerName;
          this.scrollTo(tickerName);
          this.scrollTimeoutId = setTimeout(() => {
            this.scrollTimeoutId = null;
            this.scrollToNext();
          }, this.config.autoScrollTimeout * 1000);
        }
      }
    }
  };

  removeEvent = (name, type, price) => {
    if (name && type && this.events[name]?.[type]) {
      if (price) {
        delete this.events[name][type][price];
      } else {
        delete this.events[name][type];
      }
      const levels = this.events[name].level;
      if (levels && !Object.keys(levels).length) {
        delete this.events[name].level;
      }
      const orders = this.events[name].order;
      if (orders && !Object.keys(orders).length) {
        delete this.events[name].order;
      }
      if (!Object.keys(this.events[name]).length) {
        delete this.events[name];
        this.dispatch(this);
      }
    }
  };

  removeViewedEvent = (name) => {
    const events = this.events[name];
    if (name && events) {
      if (events.level) {
        Object.keys(events.level).forEach((p) => {
          events.level[p].viewed = true;
        });
      }
      if (events.order) {
        Object.keys(events.order).forEach((p) => {
          events.order[p].viewed = true;
        });
      }
      if (events.volume) {
        events.volume.volumeViewed = true;
      }
      delete this.events[name];
      this.dispatch?.(this);
    }
    this.queue = this.queue.filter((n) => n !== name);
  };

  onError = (callback, message = 'Ошибка загрузки данных') => {
    if (!this.tickerNames) this.tickerNames = [];
    this.apiTimeout = true;
    if (message) {
      notification.error({message})
    }
    if (callback) {
      setTimeout(() => {
        this.apiTimeout = false;
        callback();
      }, 1000 * 60 * apiTimeout);
    }
    this.dispatch(this);
  };

  getSpot = () => {
    if (this.apiTimeout) {
      this.onError(this.getSpot, '');
    } else {
      this.spot = {};
      getSpotExchangeInfo()
        .then((data) => {
          if (data?.length) {
            data?.forEach((symbol) => {
              if (symbol.symbol && symbol.quoteAsset === 'USDT' && symbol.status === 'TRADING') {
                this.spot[symbol.symbol] = symbol;
              }
            });
            if (!this.futures) {
              this.getFutures();
            }
          }
        })
        .catch(() => {
          this.onError(this.getSpot);
        });
    }
  }

  getFutures = () => {
    if (this.apiTimeout) {
      this.onError(this.getFutures, '');
    } else {
      getFuturesExchangeInfo()
        .then((data) => {
          if (data?.length) {
            this.futures = {};
            this.tickers = {};
            this.tickerNames = [];
            data.forEach((symbol) => {
              if (symbol.symbol && this.spot[symbol.symbol] && symbol.contractType === 'PERPETUAL') {
                this.futures[symbol.symbol] = symbol;
                this.tickerNames.push(symbol.symbol);
                if (!this.config.tickers[symbol.symbol]) {
                  this.config.tickers[symbol.symbol] = {
                    name: symbol.symbol,
                    isActive: false,
                    isNew: true
                  }
                }
              }
            });
            if (this.tickerNames?.length) {
              if (this.config.tickers) {
                const savedTickersNames = Object.keys(this.config.tickers)
                  .filter((name) => !this.config.tickers[name].isNew);
                if (!savedTickersNames.length) {
                  this.firstStart = true;
                }
                savedTickersNames.forEach((name) => {
                  if (!this.futures[name]) {
                    delete this.config.tickers[name];
                    localStorage.removeItem(name);
                  }
                });
                Object.keys(this.config.tickers)
                  .forEach((name) => {
                    this.config.tickers[name].isNew = false;
                  });
                this.config.save();
              }
              const tickerNames = Object.keys(this.config.tickers);
              if (this.firstStart) {
                this.tickerNames = tickerNames
                  .sort()
                  .slice(0, 6);
                this.tickerNames.forEach((name) => {
                  this.config.tickers[name].isActive = true;
                });
                this.config.save();
              } else {
                this.tickerNames = tickerNames
                  .filter((name) => this.config.tickers[name].isActive)
                  .sort();
              }
              this.loading = {};
              if (this.tickerNames.length) {
                this.tickerNames.forEach((name) => {
                  this.loading[name] = true;
                  setTimeout(() => {
                    this.tickers[name] = new Ticker(name, this);
                    delete this.loading[name];
                    if (!Object.keys(this.loading).length) {
                      this.dispatch?.(this);
                    }
                  });
                });
              } else {
                this.dispatch?.(this);
              }
            } else {
              this.dispatch?.(this);
            }
          }
        })
        .catch(() => {
          this.onError(this.getFutures);
        });
    }
  }

  updateTickers() {
    this.tickerNames = Object.keys(this.config.tickers)
      .filter((name) => {
        const isActive = this.config.tickers[name].isActive
        this.loading[name] = true;
        setTimeout(() => {
          if (isActive) {
            if (!this.tickers[name]) {
              this.tickers[name] = new Ticker(name, this);
            }
          } else if (this.tickers[name]) {
            this.tickers[name].disable(false);
            delete this.events[name];
            delete this.tickers[name];
          }
          delete this.loading[name];
          if (!Object.keys(this.loading).length) {
            this.dispatch?.(this);
          }
        }, 0);
        return isActive;
      }).sort();
  };

  /* setNotification() {
    let notification;
    // Let's check if the browser supports notifications
    if (Notification) {
      alert('This browser support desktop notification');
    }

    // Let's check whether notification permissions have already been granted
    else if (Notification.permission === 'granted') {
      //   // If it's okay let's create a notification
      notification = new Notification('Hi there!');
    }
      //
    // // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(function(permission) {
        //     // If the user accepts, let's create a notification
        if (permission === 'granted') {
          notification = new Notification('Hi there!');
        }
      });
    }

    // At last, if the user has denied notifications, and you
    // want to be respectful there is no need to bother them any more.
  } */

}
