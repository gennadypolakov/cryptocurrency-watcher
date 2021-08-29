import {useState} from 'react';
import {CaretRightFilled, ExclamationCircleOutlined, PauseOutlined, SettingOutlined} from '@ant-design/icons';
import {Badge, Modal} from 'antd';
import {Tabs} from 'antd';

import {Settings} from '../Settings/Settings';
import {Tickers} from '../Tickers/Tickers';
import s from './CommonSettings.module.scss';
import {TickerNotifications} from '../TickerNotifications/TickerNotifications';

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
      {tickers.map((ticker) => <TickerNotifications
        key={ticker}
        state={state}
        name={ticker}
        lang={lang}
        scrollTo={scrollTo(ticker)}
      />)}
    </Modal>
  </>;
};
