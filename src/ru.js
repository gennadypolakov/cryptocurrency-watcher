export const translation = {
  title: 'Crypto monitor мониторинг цен, уровней, лимитных ордеров и объемов на спотовом рынке Binance',

  // график
  last5mAverageVolume: (v) => `Средний объем за последние (${v}) пятиминутные периоды`,
  allTimeAverageVolume: 'Средний объем за все загруженные пятиминутные периоды',
  currentHighVolume: 'Текущий повышенный объем',
  removeFavorite: 'Удалить из избранного',
  addFavorite: 'Добавить в избранное',
  chart: 'график',
  coinSettings: 'Индивидуальные настройки',

  // уведомления
  pauseAutoscroll: 'Пауза автоскролла',
  enableAutoscroll: 'Включить автопереход при появлении новых событий',
  commonSettings: 'Общие настройки',
  coins: 'Монеты',
  settings: 'Настройки',
  notifications: 'Уведомления',
  disableNotifications: 'Отключить уведомления',
  highVolume: 'Повышенный объем',
  limitOrder: 'Лимитный ордер',

  // настройки
  minOrder: 'Минимальный ордер',
  averageVolume: 'Средний объем',
  columnCount: 'Графиков в ширину',
  levelNotifications: 'Уведомлять об уровнях',
  priceDistance: 'Расстояние до уровня',
  priceDistanceDesc: 'Минимальное расстояние от текущей цены до ближайшего уровня в процентах от цены, чтоб сработало уведомление',
  minLevelAge: 'Возраст уровня',
  minLevelAgeDesc: 'Не уведомлять о приближении цены к уровням младше указанного возраста в часах (возможно дробное значение через точку)',
  hourlyDelta: 'Расстояние между часовыми уровнями',
  hourlyDeltaDesc: 'Минимальное количество часов между двумя уровнями',
  fourHoursDelta: 'Расстояние между четырехчасовыми уровнями',
  fourHoursDeltaDesc: 'Минимальное количество четырехчасовых интервалов между двумя уровнями',
  dailyDelta: 'Расстояние между дневными уровнями',
  dailyDeltaDesc: 'Минимальное количество дней между двумя уровнями',
  orderNotifications: 'Уведомлять о крупных ордерах',
  orderPriceDistance: 'Расстояние до ордера',
  orderPriceDistanceDesc: 'Минимальное расстояние от лучшей цены до ордера в процентах от цены, чтоб сработало уведомление',
  minOrderPercentage: 'Размер лимитного ордера',
  minOrderPercentageDesc: 'Доля от среднего объема торгов за последние N 5-минуток (за исключением последней не закрытой), если размер лимитной заявки больше вычисленного объема, то он отобразится на графике. Если на графике слишком много лимитных заявок, возможно стоит увеличить значение.',
  orderTimeout: 'Таймаут лимитного ордера',
  orderTimeoutDesc: 'Если ордер старше указанного количества минут, он отобразится на графике (возможны дробные значения через точку)',
  last5mCount: 'Количество 5-минуток для среднего объема',
  last5mCountDesc: 'Сколько последних 5-минуток использовать для вычисления среднего объема для сравнения с объемом лимитного ордера',
  highVolumeNotifications: 'Уведомлять о повышенном объеме в текущей пятиминутке',
  averageVolumeMultiplier: 'Коэффициент повышенного объема',
  averageVolumeMultiplierDesc: 'Используется для уведомлений о повышенных объемах. Объем текущего пятиминутного интервала сравнивается со средним объемом умноженным на данный коэффициент',
  notificationTimeout: 'Таймаут уведомлений в минутах',
  notificationTimeoutDesc: 'Время в минутах, в течение которого не уведомлять о монете',
  autoScroll: 'Автопереход к графику',
  autoScrollTimeout: 'Таймаут автоперехода',
  autoScrollTimeoutDesc: 'Задержка в секундах до перехода к следующему событию при наличии такого.',

  // общие
  selectAll: 'Выбрать все',
  loading: 'Загрузка...',
  level: 'уровень',
  price: 'цена',
  volume: 'объем',
  interval: 'интервал',
  close: 'Закрыть',
  enable: 'Включить',
  disable: 'Выключить',
  ok: 'Да',
  cancel: 'Отмена',
  save: 'Сохранить',
  reset: 'Сбросить'
};
