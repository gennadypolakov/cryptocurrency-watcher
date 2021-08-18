import {LineStyle} from 'lightweight-charts';
import {D1, EN, H1, M5, RU} from './constants';

export const priceLine = {
  price: 0,
  color: '#9912be',
  lineWidth: 1,
  lineStyle: LineStyle.Solid,
  axisLabelVisible: true
};
export const intervals = [M5, H1, D1];
export const lineWidths = {
  [M5]: 1,
  [H1]: 1,
  [D1]: 2
};
export const chartLimit = {
  [M5]: 1000,
  [H1]: 500,
  [D1]: 500
};

export const languages = {
  ru: RU,
  be: RU,
  uk: RU
}


export const minOrderPercentage = 1; // доля от среднего 5-минутного объема
export const last5mCount = 10; // количество 5-минуток для среднего объема
export const priceDistance = 0.005; // расстояние до цены в долях от цены
export const checkedTimout = 1; // время через которое просмотренный тикер становится не просмотренным
export const notificationTimeout = 10; // таймаут уведомлений в минутах
export const orderTimeout = 2; // количество минут, по истечение которых заявка отобразится на графике
export const minLevelAge = 3; // не сигнализировать об уровнях младше n часов
export const removeTimeout = 1; // таймаут проверки цены лимитного ордера относительно текущей цены, минуты
export const removeOrderPercentage = 0.001; // доля от цены на которую она превысила цену ордера, неудаленного по какой-либо причине
export const apiTimeout = 2; // таймаут запросов при бане апи в минутах
export const columnCount = 3; // количество графиков по ширине
export const averageVolumeMultiplier = 2; // множитель среднего объема
export const volumeViewedTimeout = 30; // таймаут уведомлений о повышенном объеме
export const dailyDelta = 15; // минимальное расстояние в количестве интервалов для вычисления дневных уровней
export const hourlyDelta = 15; // минимальное расстояние в количестве интервалов для вычисления дневных уровней
export const autoScroll = false; // автопереход к событию
export const autoScrollTimeout = 5; // автопереход к событию
export const language = EN;
