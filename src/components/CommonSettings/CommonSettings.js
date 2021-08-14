import {useState} from 'react';
import {CloseOutlined, ExclamationCircleOutlined, SettingOutlined} from '@ant-design/icons';
import {Badge, Card, Modal} from 'antd';
import {Tabs} from 'antd';

import {Settings} from '../Settings/Settings';
import {Tickers} from '../Tickers/Tickers';
import s from './CommonSettings.module.scss';
import chartStyles from '../Chart/Chart.module.scss';
import {getShorted} from '../../model/Ticker';

const {TabPane} = Tabs;

export const CommonSettings = (props) => {
  const {state} = props;
  const [visible, setVisible] = useState(false);
  const [eventsVisible, setEventsVisible] = useState(false);

  let eventCount = 0;
  let tickers = [];

  if (state?.events) {
    tickers = Object.keys(state.events).sort();
    eventCount = tickers.length;
  }

  const toChart = (ticker) => () => {
    const chart = state?.tickers?.[ticker]?.chartContainer;
    if (chart) {
      chart.scrollIntoView({behavior: 'smooth'});
      chart.classList.add(chartStyles.blinkChartBorder);
      setTimeout(() => {
        chart.classList.remove(chartStyles.blinkChartBorder);
      }, 3000);
    }
    setEventsVisible(false);
    if (state.events?.[ticker]) {
      if (state.events[ticker].level) {
        Object.keys(state.events[ticker].level).forEach((p) => {
          state.events[ticker].level[p].viewed = true;
        });
      }
      if (state.events[ticker].order) {
        Object.keys(state.events[ticker].order).forEach((p) => {
          state.events[ticker].order[p].viewed = true;
        });
      }
      if (state.events[ticker].volume) {
        state.events[ticker].volume.volumeViewed = true;
      }
      delete state.events[ticker];
      state.dispatch?.(state);
    }
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
      return levels.map((level) => <div key={`l${level.price}`}>Уровень: цена {level.price}, интервал {level.interval}</div>)
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
      return orders.map((order) => <div key={`o${order.price}`}>Лимитный ордер: цена {order.price}, объем {order.volume}</div>)
    }
    return null;
  };

  const getVolume = (ticker) => {
    if (state.events[ticker]?.volume?.highVolume) {
      const volume = state.events[ticker]?.volume?.highVolume;
      return <div>Повышенный объем: {getShorted(volume)}</div>;
    }
    return null;
  };

  return <>
    <div className={s.settings}>
      {eventCount ?
        <Badge count={eventCount}>
          <ExclamationCircleOutlined className={s.icon} onClick={() => setEventsVisible(v => !v)}/>
        </Badge>
        : null}
      <SettingOutlined className={s.icon} onClick={() => setVisible(v => !v)}/>
    </div>
    <Modal
      title="Общие настройки"
      centered
      visible={visible}
      onOk={() => setVisible(false)}
      onCancel={() => setVisible(false)}
      footer={null}
      width={800}
    >
      <Tabs defaultActiveKey="1">
        <TabPane tab="Монеты" key="1">
          <Tickers state={state}/>
        </TabPane>
        <TabPane tab="Настройки" key="2">
          <Settings state={state}/>
        </TabPane>
      </Tabs>
    </Modal>
    <Modal
      title="Уведомления"
      centered
      visible={eventsVisible}
      onOk={() => setEventsVisible(false)}
      onCancel={() => setEventsVisible(false)}
      footer={null}
      width={800}
    >
      {tickers.map((ticker) => {
        const levels = getLevels(ticker);
        const orders = getOrders(ticker);
        const volume = getVolume(ticker);
        if (!levels && !orders && !volume) {
          delete state.events[ticker];
          return null;
        }
        return (
          <Card
            className={s.card}
            extra={<div className={s.controls}>
              <CloseOutlined onClick={disableNotifications(ticker)} title="Отключить уведомления" />
            </div>}
            key={ticker}
            onClick={toChart(ticker)}
            size="small"
            title={ticker}
          >
            {levels}
            {orders}
            {volume}
          </Card>
        )})}
    </Modal>
  </>;
};
