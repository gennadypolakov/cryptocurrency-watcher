import {useState} from 'react';
import {CaretRightFilled, CloseOutlined, ExclamationCircleOutlined, PauseOutlined, SettingOutlined} from '@ant-design/icons';
import {Badge, Card, Modal} from 'antd';
import {Tabs} from 'antd';

import {Settings} from '../Settings/Settings';
import {Tickers} from '../Tickers/Tickers';
import s from './CommonSettings.module.scss';
import {getShorted} from '../../model/Ticker';

const {TabPane} = Tabs;

export const CommonSettings = (props) => {
  const {state, lang} = props;
  const [visible, setVisible] = useState(false);
  const [eventsVisible, setEventsVisible] = useState(false);
  const [play, setPlay] = useState(state?.play);

  const autoScroll = state?.config?.autoScroll;

  let eventCount = 0;
  let tickers = [];

  if (state?.events) {
    tickers = Object.keys(state.events).sort();
    eventCount = tickers.length;
  }

  const playScroll = (value) => {
    if (state) {
      state.play = value;
      if (value) state.scrollToNext();
    }
    setPlay(value);
  }

  const scrollTo = (ticker) => () => {
    state?.scrollTo(ticker);
    state?.removeViewedEvent(ticker);
    setEventsVisible(false);
  }

  const disableNotifications = (ticker) => () => {
    if (state.events?.[ticker]) {
      delete state.events[ticker];
    }
    state.tickers?.[ticker]?.enableTimeout();
    state.dispatch?.(state);
  };

  const getLevels = (ticker) => {
    if (state.events[ticker]?.level) {
      const levelMap = state.events[ticker].level;
      const levels = Object.keys(levelMap).map((price) => levelMap[price]);
      return levels.map((level) => <div key={`l${level.price}`}>{lang?.level}: {lang?.price} {level.price}, {lang?.interval} {level.interval}</div>)
    }
    return null;
  };

  const getOrders = (ticker) => {
    if (state.events[ticker]?.order) {
      const orderMap = state.events[ticker].order;
      const orders = Object.keys(orderMap)
        .sort((a, b) => b - a)
        .map((price) => orderMap[price])
        .filter((o) => o.volume);
      return orders.map((order) => <div key={`o${order.price}`}>{lang?.limitOrder}: {lang?.price} {order.price}, {lang?.volume} {getShorted(order.volume)}</div>)
    }
    return null;
  };

  const getVolume = (ticker) => {
    if (state.events[ticker]?.volume?.highVolume) {
      const volume = state.events[ticker]?.volume?.highVolume;
      return <div>{lang?.highVolume}: {getShorted(volume)}</div>;
    }
    return null;
  };

  const cards = tickers.map((ticker) => {
    const levels = getLevels(ticker);
    const orders = getOrders(ticker);
    const volume = getVolume(ticker);
    if (!levels && !orders && !volume) {
      state?.removeViewedEvent(ticker);
      return null;
    }
    return {ticker, levels, orders, volume};
  }).filter((card) => !!card);

  return <>
    <div className={s.settings}>
      {autoScroll
        ? (play
          ? <PauseOutlined className={s.icon}  onClick={() => playScroll(false)} title={lang?.pauseAutoscroll} />
          : <CaretRightFilled className={s.icon} onClick={() => playScroll(true)} title={lang?.enableAutoscroll} />
        ) : null}
      {eventCount ?
        <Badge count={eventCount}>
          <ExclamationCircleOutlined className={s.icon} onClick={() => setEventsVisible(v => !v)}/>
        </Badge>
        : null}
      <SettingOutlined className={s.icon} onClick={() => setVisible(v => !v)}/>
    </div>
    <Modal
      title={lang?.commonSettings}
      centered
      visible={visible}
      onOk={() => setVisible(false)}
      onCancel={() => setVisible(false)}
      footer={null}
      width={800}
    >
      <Tabs defaultActiveKey="1">
        <TabPane tab={lang?.coins} key="1">
          <Tickers {...props} />
        </TabPane>
        <TabPane tab={lang?.settings} key="2">
          <Settings {...props} />
        </TabPane>
      </Tabs>
    </Modal>
    <Modal
      title={lang?.notifications}
      centered
      visible={eventsVisible}
      onOk={() => setEventsVisible(false)}
      onCancel={() => setEventsVisible(false)}
      footer={null}
      width={800}
    >
      {cards.map(({ticker, levels, orders, volume}) => (
        <Card
          className={s.card}
          extra={<div className={s.controls}>
            <CloseOutlined onClick={disableNotifications(ticker)} title={lang?.disableNotifications} />
          </div>}
          key={ticker}
          onClick={scrollTo(ticker)}
          size="small"
          title={ticker}
        >
          {levels}
          {orders}
          {volume}
        </Card>
      ))}
    </Modal>
  </>;
};
