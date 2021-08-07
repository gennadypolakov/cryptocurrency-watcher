import {LineStyle} from 'lightweight-charts';

export const priceLine = {
  price: 0,
  color: '#9912be',
  lineWidth: 1,
  lineStyle: LineStyle.Solid,
  axisLabelVisible: true
};
export const ask = 'ask';
export const bid = 'bid';
export const m5 = '5m';
export const h1 = '1h';
export const d1 = '1d';
export const intervals = [m5, h1, d1];
export const lineWidths = {
  [m5]: 1,
  [h1]: 1,
  [d1]: 2
};
export const chartLimit = {
  [m5]: 1000,
  [h1]: 500,
  [d1]: 500
};
export const minOrderPercentage = 1; // доля от среднего 5-минутного объема
export const last5mCount = 10; // количество 5-минуток для среднего объема
export const priceDistance = 0.005; // расстояние до цены в долях от цены
export const checkedTimout = 1; // время через которое просмотренный тикер становится не просмотренным
export const notificationTimeout = 5; // таймаут уведомлений в минутах
export const orderTimeout = 0.5; // количество минут, по истечение которых заявка отобразится на графике
export const minLevelAge = 3; // не сигнализировать об уровнях младше n часов
export const removeTimeout = 1; // таймаут проверки цены лимитного ордера относительно текущей цены, минуты
export const removeOrderPercentage = 0.001; // доля от цены на которую она превысила цену ордера, неудаленного по какой-либо причине
export const apiTimeout = 2; // таймаут запросов при бане апи в минутах
