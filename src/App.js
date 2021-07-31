import {useEffect, useState} from 'react';
import {createChart, LineStyle} from 'lightweight-charts';
import axios from 'axios';
import {set, takeRight, take} from 'lodash';
import './App.css';

const axiosInstance = axios.create({
  baseURL: 'https://api.binance.com',
  responseType: 'json'
});

const axiosFutures = axios.create({
  baseURL: 'https://fapi.binance.com',
  responseType: 'json'
});

const priceLine = {
  price: 0,
  color: '#9912be',
  lineWidth: 1,
  lineStyle: LineStyle.Solid,
  axisLabelVisible: true
};
const m5 = '5m';
const h1 = '1h';
const d1 = '1d';
const tickers = ['BTCUSDT', 'ALICEUSDT', 'AXSUSDT'];
const intervals = [m5, h1, d1];
const refs = {};
const lineWidths = {
  [h1]: 1,
  [d1]: 2
}

const setExtremes = (state, interval) => {
  const data = state?.data?.[interval];
  const series = state?.series;
  if (data?.length && series) {
    const lineWidth = lineWidths[interval];
    let currentHigh = [0, 0];
    let currentLow = [0, 0];
    let highPushed = false;
    let lowPushed = false;
    for(let i = data.length - 1; i >= 0; i--) {
      const time = data[i][0];
      const high = Number(data[i][2]);
      const low = Number(data[i][3]);
      if (i === data.length - 1) {
        currentHigh = [high, time];
        currentLow = [low, time];
      } else {
        if (high > currentHigh[0]) {
          currentHigh = [high, time];
          highPushed = false;
        } else if (high < currentHigh[0] && !highPushed) {
          if (state.highs[interval][currentHigh[0]]) {
            series.removePriceLine(state.highs[interval][currentHigh[0]].line);
          }
          if (interval === d1 && state.highs[h1][currentHigh[0]]) {
            series.removePriceLine(state.highs[h1][currentHigh[0]].line);
            delete state.highs[h1][currentHigh[0]];
          }
          state.highs[interval][currentHigh[0]] = {
            line: series.createPriceLine({
              ...priceLine,
              price: currentHigh[0],
              lineWidth,
            }),
            time: currentHigh[1]
          };
          highPushed = true;
        }
        if (low < currentLow[0]) {
          currentLow = [low, time];
          lowPushed = false;
        } else if (low > currentLow[0] && !lowPushed) {
          if (state.lows[interval][currentLow[0]]) {
            series.removePriceLine(state.lows[interval][currentLow[0]].line);
          }
          if (interval === d1 && state.lows[h1][currentLow[0]]) {
            series.removePriceLine(state.lows[h1][currentLow[0]].line);
            delete state.lows[h1][currentLow[0]];
          }
          state.lows[interval][currentLow[0]] = {
            line: series.createPriceLine({
              ...priceLine,
              price: currentLow[0],
              lineWidth
            }),
            time: currentLow[1]
          };
          lowPushed = true;
        }
      }
    }
    if (interval === d1) {
      let highs = [];
      if (state.highs[h1]) highs = Object.keys(state.highs[h1]).map((key) => Number(key));
      if (state.highs[d1]) highs = [...highs, ...Object.keys(state.highs[d1]).map((key) => Number(key))];
      state.highs.price = Array.from(new Set(highs)).sort((a, b) => a - b);
      let lows = [];
      if (state.lows[h1]) lows = Object.keys(state.lows[h1]).map((key) => Number(key));
      if (state.lows[d1]) lows = [...lows, ...Object.keys(state.lows[d1]).map((key) => Number(key))];
      state.lows.price = Array.from(new Set(lows)).sort((a, b) => b - a);
    }
  }
};

const setOrderLine = (ticker, data, state, side) => {
  const sorted = data.map((order) => [Number(order[0]), Number(order[1])]).sort((a, b) => b[1] - a[1]);
  const maxVolume = sorted[0];
  const orderLine = {
    ...priceLine,
    color: '#107b00',
    lineStyle: LineStyle.Solid,
    axisLabelVisible: true,
    price: maxVolume[0],
    lineWidth: 1,
    title: maxVolume[1]
  };
  const orders = state[ticker]?.orders?.[side];
  if (orders) {
    Object.keys(orders).forEach((price) => {
      if (state[ticker].series) {
        state[ticker].series.removePriceLine(orders[price]);
      }
    });
  }
  if (state[ticker].series) {
    set(state, [ticker, 'orders', side, maxVolume[0]], state[ticker].series.createPriceLine(orderLine));
  }
};

const setOrderLines = (state) => {
  if (!state?.orders) {
    state.orders = {asks: {}, bids: {}};
  }
  const {orderBook, series} = state;
  const {asks, bids} = orderBook || {};
  // искать плотности больше чем 1/4 объема на 5 минутах
  if (asks) {
    let askPrices = Object.keys(asks).map((ask) => Number(ask)).sort((a, b) => a - b);
    const bestAsk = askPrices[0];
    askPrices = askPrices
      .filter((price) => (price - bestAsk) / bestAsk < 0.005)
      .sort((a, b) => asks[b] - asks[a]);
    const maxVolume = asks[askPrices[0]];
    const orderLine = {
      ...priceLine,
      color: '#107b00',
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      price: askPrices[0],
      lineWidth: 1,
      title: maxVolume
    };
    const orders = state.orders.asks;
    if (series) {
      if (orders) {
        Object.keys(orders).forEach((price) => {
          series.removePriceLine(orders[price]);
        });
      }
      orders[askPrices[0]] = series.createPriceLine(orderLine);
    }
  }
  if (bids) {
    let bidPrices = Object.keys(bids).map((bid) => Number(bid)).sort((a, b) => b - a);
    const bestBid = bidPrices[0];
    bidPrices = bidPrices
      .filter((price) => (bestBid - price) / bestBid < 0.005)
      .sort((a, b) => bids[b] - bids[a]);
    const maxVolume = bids[bidPrices[0]];
    const orderLine = {
      ...priceLine,
      color: '#107b00',
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      price: bidPrices[0],
      lineWidth: 1,
      title: maxVolume
    };
    const orders = state.orders.bids;
    if (series) {
      if (orders) {
        Object.keys(orders).forEach((price) => {
          series.removePriceLine(orders[price]);
        });
      }
      orders[bidPrices[0]] = series.createPriceLine(orderLine);
    }
  }
};

const symbols = {
  spot: {},
  futures: {},
};

const stateLink = {state: {}};

const updateOrderBook = (orderBook, update) => {
  const {asks, bids} = orderBook;
  update?.a?.forEach((ask) => {
    const volume = Number(ask[1]);
    const price = Number(ask[0]);
    if (volume) {
      asks[price] = volume;
    } else if (asks[price]) {
      delete asks[price];
    }
  });
  update?.b?.forEach((bid) => {
    const price = Number(bid[0]);
    const volume = Number(bid[1]);
    if (volume) {
      bids[price] = volume;
    } else if (bids[price]) {
      delete bids[price];
    }
  });
};

export const App = () => {
  const [state, setState] = useState({});
  // const futures = state?.symbols?.futures ? Object.keys(state.symbols.futures).sort().slice(0, 3) : [];
  const futures = ['BTCUSDT'];
  stateLink.state = state;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  // for (let ticker of futures) refs[ticker] = useRef();
  const setRef = (ref, ticker) => {
    if (ref && !state[ticker]?.ref) {
      set(state, [ticker, 'ref'], ref);
    }
  };

  useEffect(() => {
    if (state?.symbols?.futures) {
      // const futures = Object.keys(state.symbols.futures).sort().slice(0, 3);
      const futures = ['BTCUSDT'];
      if (futures.length) {
        futures.forEach((symbol) => {
          intervals.forEach((interval) => {
            if (!state[symbol]?.data?.[interval]) {
              set(state, [symbol, 'data', interval], []);
              axiosInstance.get('/api/v3/klines', {params: {symbol, interval}}).then((data) => {
                if (data.data) {
                  set(state, [symbol, 'data', interval], data.data);
                  setState({...state});
                }
              });
            }
          });
        })
      }
    }
  }, [state]);

  useEffect(() => {
    if (!state.symbols) {
      state.symbols = symbols;
      axiosInstance.get('/api/v3/exchangeInfo').then((data) => {
        if (data?.data?.symbols) {
          data?.data?.symbols?.forEach((symbol) => {
            if (symbol.symbol && symbol.quoteAsset === 'USDT' && symbol.status === 'TRADING') {
              state.symbols.spot[symbol.symbol] = symbol;
            }
          });
          axiosFutures.get('/fapi/v1/exchangeInfo').then((data) => {
            if (data?.data?.symbols) {
              data.data.symbols.forEach((symbol) => {
                if (symbol.symbol && state.symbols.spot[symbol.symbol] && symbol.contractType === 'PERPETUAL') {
                  state.symbols.futures[symbol.symbol] = symbol;
                }
              });
              setState({...state});
            }
          });
        }
      });
    }
  }, [state]);

    // console.log('state', state);

  // const getExtremes = (data, lineWidth) => {
  //   if (data?.length) {
  //     const highs = [];
  //     const lows = [];
  //     let currentHigh = 0;
  //     let currentLow = 0;
  //     let highPushed = false;
  //     let lowPushed = false;
  //     for(let i = data.length - 1; i >= 0; i--) {
  //       const high = Number(data[i][2]);
  //       const low = Number(data[i][3]);
  //       if (i === data.length - 1) {
  //         currentHigh = high;
  //         currentLow = low;
  //       } else {
  //         if (high > currentHigh) {
  //           currentHigh = high;
  //           highPushed = false;
  //         } else if (high < currentHigh && !highPushed) {
  //           highs.push({
  //             ...priceLine,
  //             price: currentHigh,
  //             lineWidth
  //           });
  //           highPushed = true;
  //         }
  //         if (low < currentLow) {
  //           currentLow = low;
  //           lowPushed = false;
  //         } else if (low > currentLow && !lowPushed) {
  //           lows.push({
  //             ...priceLine,
  //             price: currentLow,
  //             lineWidth
  //           });
  //           lowPushed = true;
  //         }
  //       }
  //     }
  //     return {highLevels: highs, lowLevels: lows};
  //   }
  //   return {};
  // };

  useEffect(() => {
    if (state?.symbols?.futures) {
      // const futures = Object.keys(state.symbols.futures).sort().slice(0, 3);
      const futures = ['BTCUSDT'];
      if (futures.length) {
        futures.forEach((ticker) => {
          if (
            state[ticker]?.data?.['1h']?.length &&
            state[ticker]?.data?.['1d']?.length &&
            state[ticker]?.series &&
            !state[ticker]?.highs &&
            !state[ticker]?.lows
          ) {
            state[ticker].highs = {[h1]: {}, [d1]: {}, price: []};
            state[ticker].lows = {[h1]: {}, [d1]: {}, price: []};
            setExtremes(state[ticker], h1);
            setExtremes(state[ticker], d1);
          }
        });
      }
    }
  }, [state]);

  // useEffect(() => {
  //   const ws = new WebSocket(`wss://stream.binance.com:9443/ws/aaveusdt@depth@1000ms`);
  //   ws.onmessage = (e) => {
  //     if (e.data) {
  //       console.log('bookTicker', JSON.parse(e.data));
  //     }
  //   };
  // }, []);

  useEffect(() => {
    const {state} = stateLink;
    if (state?.symbols?.futures) {
      // const futures = Object.keys(state.symbols.futures).sort().slice(0, 3);
      const futures = ['BTCUSDT'];
      if (futures.length) {
        futures.forEach((ticker) => {
          // if (!state[ticker].orderBook && state[ticker].series) {
          //   set(state, [ticker, 'orderBook'], {});
          //   set(state, [ticker, 'orders'], {asks: {}, bids: {}});
          //   const setOrdersLine = () => {
          //     axiosInstance.get('/api/v3/depth', {params: {symbol: ticker, limit: 1000}}).then((data) => {
          //       if (data.data) {
          //         let {asks, bids} = data.data;
          //         if (asks?.length) {
          //           setOrderLine(ticker, asks, state, 'asks');
          //         }
          //         if (bids?.length) {
          //           setOrderLine(ticker, bids, state, 'bids');
          //         }
          //         console.log('state[ticker]', state[ticker]);
          //         console.log('orderBook', data);
          //       }
          //     });
          //   };
          //   // setOrdersLine();
          //   // setInterval(setOrdersLine, 5000);
          // }
          if (!state[ticker].orderStream) {
            set(state, [ticker, 'orderStream'], []);
            const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${ticker.toLowerCase()}@depth@1000ms`);
            ws.onmessage = (e) => {
              if (e.data) {
                const {state} = stateLink;
                const update = JSON.parse(e.data);
                if (state[ticker].orderBookSynced) {
                  updateOrderBook(state[ticker].orderBook, update);
                  setOrderLines(state[ticker]);
                } else {
                  state[ticker].orderStream.push(update);
                }
                // console.log('orderStream', state[ticker].orderStream);
                if (!state[ticker].orderBook) {
                  set(state, [ticker, 'orderBook'], {});
                  axiosInstance.get('/api/v3/depth', {params: {symbol: ticker, limit: 1000}}).then((data) => {
                    if (data.data) {
                      const {state} = stateLink;
                      const asks = {};
                      data.data.asks.forEach((ask) => {
                        asks[Number(ask[0])] = Number(ask[1]);
                      });
                      const bids = {};
                      data.data.bids.forEach((bid) => {
                        bids[Number(bid[0])] = Number(bid[1]);
                      });
                      state[ticker].orderBook = {
                        asks,
                        bids,
                        lastUpdateId: data.data.lastUpdateId
                      };
                      const syncOrderBook = () => {
                        const {state} = stateLink;
                        const lastUpdateId = state[ticker]?.orderBook?.lastUpdateId;
                        if (state[ticker].orderStream?.length && lastUpdateId) {
                          const updateId = state[ticker].orderStream.findIndex((u) => u.U <= lastUpdateId + 1 && u.u >= lastUpdateId + 1);
                          if (updateId === -1) {
                            setTimeout(() => {
                              syncOrderBook();
                            }, 1000);
                          } else {
                            for(let i = updateId; i < state[ticker].orderStream.length; i++) {
                              updateOrderBook(state[ticker].orderBook, state[ticker].orderStream[i]);
                            }
                            state[ticker].orderBookSynced = true;
                            state[ticker].orderStream.length = 0;
                          }
                        }
                      };
                      syncOrderBook();
                    }
                  });
                }
              }
            };
          }
        });
      }
    }
  }, [state]);

  useEffect(() => {
    if (state?.symbols?.futures) {
      // const futures = Object.keys(state.symbols.futures).sort().slice(0, 3);
      const futures = ['BTCUSDT'];
      if (futures.length) {
        if (!state.check) state.check = [];
        futures.forEach((ticker) => {
          if (
            state[ticker]?.ref &&
            state[ticker]?.data?.[m5]?.length &&
            !state[ticker]?.series
          ) {
            const data = state[ticker]?.data?.[m5];
            const last5 = takeRight(data, 5)?.map((candlestick) => candlestick[5] && Number(candlestick[5]))?.sort((a, b) => b - a);
            state[ticker].maxVolume = last5[0] || 0;
            // console.log('last5', ticker, last5);
            // console.log('maxVolume', ticker, state[ticker].maxVolume);
            const chart = createChart(state[ticker].ref, { width: 580, height: 465 });
            // chart.applyOptions({
            //   priceScale:{
            //     autoScale: false,
            //   }
            // });
            // console.log('chart?.timeScale()', chart?.timeScale());
            const series = chart.addCandlestickSeries();
            state[ticker].series = series;
            series.setData(data.map((candlestick) => ({
              time: candlestick[0] / 1000,
              open: Number(candlestick[1]),
              high: Number(candlestick[2]),
              low: Number(candlestick[3]),
              close: Number(candlestick[4])
            })));
            chart?.timeScale()?.setVisibleRange({
              from: (Date.now() - 60 * 60 * 12 * 1000) / 1000,
              to: Date.now() / 1000,
            });
            chart.applyOptions({
              timeScale: {
                rightOffset: 10,
                timeVisible: true
                // barSpacing: 3,
                // fixLeftEdge: true,
                // lockVisibleTimeRangeOnResize: true,
                // rightBarStaysOnScroll: true,
                // borderVisible: false,
                // borderColor: '#fff000',
                // visible: true,
                // timeVisible: true,
                // secondsVisible: false,
                // tickMarkFormatter: (time, tickMarkType, locale) => {
                //   console.log(time, tickMarkType, locale);
                //   const year = LightweightCharts.isBusinessDay(time) ? time.year : new Date(time * 1000).getUTCFullYear();
                //   return String(year);
                // },
              },
            });
            const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${ticker.toLowerCase()}@kline_5m`);
            // ws.onopen = (e) => console.log('ws opened', e);
            ws.onmessage = (e) => {
              if (e.data) {
                const update = JSON.parse(e.data);
                console.log('kline_5m', ticker, update);
                if (update?.k?.t && update?.k?.o && update?.k?.h && update?.k?.l && update?.k?.c) {
                  // обновлять объемы свечей
                  const {state} = stateLink;
                  const delta = 0.005;
                  const high = Number(update.k.h);
                  const low = Number(update.k.l);
                  const time = update.k.t;
                  if (state[ticker]?.lows?.price?.length) {
                    const low1 = state[ticker].lows.price[0];
                    const time1 = state[ticker]?.lows?.[h1]?.[low1]?.time || state[ticker]?.lows?.[d1]?.[low1]?.time;
                    if (low > low1) {
                      if (
                        ((low - low1) / low) < delta &&
                        Date.now() - time1 > 1000 * 60 * 60 * 2 &&
                        !state.check.find((t) => t === ticker) &&
                        !state.removed?.[ticker]
                      ) {
                        state.check.push(ticker);
                      }
                    } else {
                      const expired = state[ticker].lows.price.filter((p) => p >= low);
                      state[ticker].lows.price = [low, ...state[ticker].lows.price.filter((p) => p < low)];
                      expired.forEach((price) => {
                        if (state[ticker].lows[h1]?.[price]) {
                          series.removePriceLine(state[ticker].lows[h1][price].line);
                          delete state[ticker].lows[h1][price];
                        }
                        if (state[ticker].lows[d1]?.[price]) {
                          series.removePriceLine(state[ticker].lows[d1][price].line);
                          delete state[ticker].lows[d1][price];
                        }
                      });
                      state[ticker].lows[h1][low] = {
                        line: series.createPriceLine({
                          ...priceLine,
                          price: low,
                          lineWidth: lineWidths[h1]
                        }),
                        time
                      };
                    }
                  }
                  if (state[ticker]?.highs?.price?.length) {
                    const high1 = state[ticker].highs.price[0];
                    const time1 = state[ticker]?.highs?.[h1]?.[high1]?.time || state[ticker]?.highs?.[d1]?.[high1]?.time;
                    if (high < high1) {
                      if (
                        ((high1 - high) / high) < delta &&
                        Date.now() - time1 > 1000 * 60 * 60 * 2 &&
                        !state.check.find((t) => t === ticker) &&
                        !state.removed?.[ticker]
                      ) {
                        state.check.push(ticker);
                      }
                    } else {
                      const expired = state[ticker].highs.price.filter((p) => p <= high);
                      state[ticker].highs.price = [high, ...state[ticker].highs.price.filter((p) => p > high)];
                      expired.forEach((price) => {
                        if (state[ticker].highs[h1]?.[price]) {
                          series.removePriceLine(state[ticker].highs[h1][price].line);
                          delete state[ticker].highs[h1][price];
                        }
                        if (state[ticker].highs[d1]?.[price]) {
                          series.removePriceLine(state[ticker].highs[d1][price].line);
                          delete state[ticker].highs[d1][price];
                        }
                      });
                      state[ticker].highs[h1][high] = {
                        line: series.createPriceLine({
                          ...priceLine,
                          price: high,
                          lineWidth: lineWidths[h1]
                        }),
                        time
                      };
                    }
                  }
                  series.update({
                    time: time / 1000,
                    open: Number(update.k.o),
                    high,
                    low,
                    close: Number(update.k.c)
                  });
                  setState({...state});
                }
              }
            }
          }
        });
      }
    }
  }, [state]);

  const removeChecked = (symbol) => {
    const {state} = stateLink;
    set(state, ['removed', symbol], Date.now());
    state.check = state.check.filter((s) => s !== symbol);
    setState({...state});
    setTimeout(() => {
      const {state} = stateLink;
      delete state.removed?.[symbol];
      setState({...state});
    }, 1000 * 60 * 10);
  };

  const setChecked = (symbol) => {
    const {state} = stateLink;
    set(state, ['class', symbol], 'checked');
    setState({...state});
    setTimeout(() => {
      const {state} = stateLink;
      set(state, ['class', symbol], 'notChecked');
      setState({...state});
    }, 1000 * 60 * 5);
  };

  return <div className="charts">
    {futures.map((ticker) => <div className="chart" key={ticker} id={ticker}>
      <div>{ticker}</div>
      <div ref={(ref) => setRef(ref, ticker)} />
    </div>)}
    {state.check?.length ? <div className="check">
      {state.check.map((ticker) => <div key={ticker} className="symbol">
        <a
          href={`#${ticker}`}
          className={state.class?.[ticker] || 'notChecked'}
          onClick={() => setChecked(ticker)}
        >{ticker}</a>
        <span onClick={() => removeChecked(ticker)}>X</span>
      </div>)}
    </div> : null}
  </div>;
}
