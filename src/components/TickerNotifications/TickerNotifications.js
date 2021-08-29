import {useCallback, useMemo} from 'react';
import {CloseOutlined, StopOutlined} from '@ant-design/icons';
import {Card} from 'antd';

import s from './TickerNotifications.module.scss';
import {getShorted} from '../../model/Ticker';

export const TickerNotifications = (props) => {
  const {name, lang, scrollTo, state} = props;
  const tickerEvents = useMemo(() => state.events[name], [name, state.events]);
  const {levelNotifications, orderNotifications, highVolumeNotifications} = useMemo(() => name && state.tickers?.[name]?.config, [name, state.tickers]);

  const disableNotifications = (e) => {
    e.stopPropagation();
    state.tickers?.[name]?.enableTimeout();
    state?.removeViewedEvent(name);
  };

  const removeNotifications = (e) => {
    e.stopPropagation();
    state?.removeViewedEvent(name);
  };

  const Levels = useCallback(() => {
    if (levelNotifications && tickerEvents?.level) {
      const prices = Object.keys(tickerEvents.level);
      if (prices.length) {
        return prices.map((price) => {
          const level = tickerEvents.level[price];
          return <div key={`l${level.price}`}>{lang?.level}: {lang?.price} {level.price}, {lang?.interval} {level.interval}</div>;
        });
      }
    }
    return null;
  }, [lang, levelNotifications, tickerEvents.level]);

  const Orders = useCallback(() => {
    if (orderNotifications && tickerEvents?.order) {
      const prices = Object.keys(tickerEvents.order);
      if (prices.length) {
        return prices
          .map((price) => Number(price))
          .sort((a, b) => b - a)
          .map((price) => tickerEvents.order[price])
          .filter((o) => o.volume)
          .map((order) => <div key={`o${order.price}`}>{lang?.limitOrder}: {lang?.price} {order.price}, {lang?.volume} {getShorted(order.volume)}</div>)
      }
    }
    return null;
  }, [lang, orderNotifications, tickerEvents.order]);

  const Volumes = useCallback(() => {
    if (highVolumeNotifications && tickerEvents?.volume?.highVolume) {
      return <div>{lang?.highVolume}: {getShorted(tickerEvents.volume.highVolume)}</div>;
    }
    return null;
  }, [highVolumeNotifications, lang, tickerEvents?.volume?.highVolume]);

  if (!tickerEvents.level && !tickerEvents.order && !tickerEvents.volume) {
    return null;
  }

  return (
    <Card
      className={s.card}
      extra={<div className={s.controls}>
        <StopOutlined onClick={disableNotifications} title={lang?.disableNotifications} />
        <CloseOutlined onClick={removeNotifications} title={lang?.removeNotifications} />
      </div>}
      key={name}
      onClick={scrollTo}
      size="small"
      title={name}
    >
      <Levels />
      <Orders />
      <Volumes />
    </Card>
  );
};
