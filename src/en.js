export const translation = {
  title: 'Crypto monitor - live crypto monitoring: price levels, orders, volumes on Binance spot',

  // chart
  last5mAverageVolume: (v) => `Last 5m (${v}) average volume`,
  allTimeAverageVolume: 'All time average volume',
  currentHighVolume: 'Current high volume',
  removeFavorite: 'Remove favorite',
  addFavorite: 'Add favorite',
  chart: 'chart',
  coinSettings: 'Coin settings',

  // controls, notifications
  pauseAutoscroll: 'Pause autoscroll',
  enableAutoscroll: 'Enable autoscroll on new events',
  commonSettings: 'Common settings',
  coins: 'Coins',
  settings: 'Settings',
  notifications: 'Notifications',
  disableNotifications: 'Disable notifications',
  highVolume: 'High volume',
  limitOrder: 'Limit order',

  // settings
  minOrder: 'Min order',
  averageVolume: 'Average volume',
  columnCount: 'Chart column count',
  priceDistance: 'Distance to level or order',
  priceDistanceDesc: 'The minimum distance from the current price to the nearest hourly or daily level or limit order in fractions of the price for the notification to be triggered',
  minLevelAge: 'Min level age',
  minLevelAgeDesc: 'Do not notify about the approach of prices to levels below the specified age in hours (possibly a fractional value through a dot)',
  hourlyDelta: 'Distance between hour levels',
  hourlyDeltaDesc: 'Minimum number of hours between two levels',
  fourHoursDelta: 'Distance between four hours levels',
  fourHoursDeltaDesc: 'Minimum number of four hours between two levels',
  dailyDelta: 'Distance between day levels',
  dailyDeltaDesc: 'Minimum number of days between two levels',
  minOrderPercentage: 'Limit order size',
  minOrderPercentageDesc: 'The share of the average trading volume for the last N 5-minutes (except for the last not closed), if the size of the limit order is greater than the calculated volume, it will be displayed on the chart. If there are too many limit orders on the chart, it may be worth increasing the value.',
  orderTimeout: 'Limit order timeout',
  orderTimeoutDesc: 'If the order is older than the specified number of minutes, it will be displayed on the chart (fractional values through a dot are possible)',
  last5mCount: 'Number of 5 minute volumes for average volume',
  last5mCountDesc: 'How many of the last 5-minute volumes to use to calculate the average volume for comparison with the volume of the limit order',
  averageVolumeMultiplier: 'Average volume multiplier',
  averageVolumeMultiplierDesc: 'Used for high volume notifications. The volume of the current five-minute interval is compared with the average volume multiplied by this coefficient',
  notificationTimeout: 'Notification timeout',
  notificationTimeoutDesc: 'Time in minutes during which to not notify about the coin',
  autoScroll: 'Autoscroll to the chart',
  autoScrollTimeout: 'Autoscroll timeout',
  autoScrollTimeoutDesc: 'Delay in seconds before moving to the next event if such',

  // common
  selectAll: 'Select all',
  loading: 'Loading...',
  level: 'Level',
  price: 'price',
  volume: 'volume',
  interval: 'interval',
  close: 'Close',
  enable: 'Enable',
  disable: 'Disable',
  ok: 'Ok',
  cancel: 'Cancel',
  save: 'Save',
  reset: 'Reset'
};
