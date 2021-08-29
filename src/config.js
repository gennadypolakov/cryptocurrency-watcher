import {LineStyle} from 'lightweight-charts';
import {D1, EN, H1, H4, M5, RU} from './constants';

export const priceLine = {
  price: 0,
  color: '#9912be',
  lineWidth: 1,
  lineStyle: LineStyle.Solid,
  axisLabelVisible: true
};
export const intervals = [M5, H1, H4, D1];
export const lineWidths = {
  [M5]: 1,
  [H1]: 1,
  [H4]: 2,
  [D1]: 3
};
export const chartLimit = {
  [M5]: 1000,
  [H1]: 500,
  [H4]: 500,
  [D1]: 500
};

export const languages = {
  ru: RU,
  be: RU,
  uk: RU
};

export const chartRightOffset = 30;

export const levelNotifications = true; // уведомления об уровнях
export const orderNotifications = true; // уведомления о крупных ордерах
export const highVolumeNotifications = false; // уведомления о повышенном объеме на текущей пятиминутке
export const minOrderPercentage = 1; // доля от среднего 5-минутного объема
export const last5mCount = 3; // количество 5-минуток для среднего объема
export const priceDistance = 0.005; // расстояние от уровня до цены в процентах от цены
export const orderPriceDistance = 0.03; // расстояние от ордера до лучшей цены в процентах от цены
export const checkedTimout = 1; // время через которое просмотренный тикер становится не просмотренным
export const notificationTimeout = 10; // таймаут уведомлений в минутах
export const orderTimeout = 2; // количество минут, по истечение которых заявка отобразится на графике
export const minLevelAge = 5; // не сигнализировать об уровнях младше n часов
export const removeTimeout = 1; // таймаут проверки цены лимитного ордера относительно текущей цены, минуты
export const removeOrderPercentage = 0.001; // доля от цены на которую она превысила цену ордера, неудаленного по какой-либо причине
export const apiTimeout = 2; // таймаут запросов при бане апи в минутах
export const columnCount = 2; // количество графиков по ширине
export const averageVolumeMultiplier = 2; // множитель среднего объема
export const volumeViewedTimeout = 30; // таймаут уведомлений о повышенном объеме
export const hourlyDelta = 15; // минимальное количество часовых свечей между часовыми уровнями
export const fourHoursDelta = 15; // минимальное количество 4-х часовых свечей между 4-х часовыми уровнями
export const dailyDelta = 15; // минимальное количество дневных свечей между дневными уровнями
export const autoScroll = false; // автопереход к событию
export const autoScrollTimeout = 10; // автопереход к событию
export const language = EN;
