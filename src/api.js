import axios from 'axios';

export const axiosSpot = axios.create({
  baseURL: 'https://api.binance.com',
  responseType: 'json',
});

export const axiosFutures = axios.create({
  baseURL: 'https://fapi.binance.com',
  responseType: 'json',
});

export const getSpotExchangeInfo = () => axiosSpot.get('/api/v3/exchangeInfo')
  .then((data) => data?.data?.symbols);

export const getFuturesExchangeInfo = () => axiosFutures.get('/fapi/v1/exchangeInfo')
  .then((data) => data?.data?.symbols);

export const getSymbolChartData = (symbol, interval, limit) =>
  axiosSpot.get('/api/v3/klines', {params: {symbol, interval, limit}})
    .then((data) => data?.data);

export const getSymbolChartDataByRange = (symbol, interval, startTime, endTime) =>
  axiosSpot.get('/api/v3/klines', {params: {symbol, interval, startTime, endTime}})
    .then((data) => data?.data);

export const getSymbolOrderBook = (symbol, limit) =>
  axiosSpot.get('/api/v3/depth', {params: {symbol, limit}})
    .then((data) => data?.data);
