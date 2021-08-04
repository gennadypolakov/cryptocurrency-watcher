import s from './Chart.module.scss';
import {useEffect, useRef, useState} from 'react';
import {Modal} from 'antd';
import {Settings} from '../Settings/Settings';
import {CloseOutlined, SettingOutlined} from '@ant-design/icons';

export const Chart = (props) => {
  const ref = useRef();
  const {ticker} = props;
  const {name: symbol} = ticker;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [acceptVisible, setAcceptVisible] = useState(false);

  useEffect(() => {
    ticker.createChart(ref.current);
  }, []);

  return (
    <>
      <div className={s.chart} id={symbol}>
        <div className={s.header}>
          <span>{symbol}</span>
          <div className={s.controls}>
            <SettingOutlined
              onClick={() => setSettingsVisible(v => !v)}
              title="Индивидуальные настройки"
            />
            <CloseOutlined
              onClick={() => setAcceptVisible(v => !v)}
              title="Закрыть"
            />
          </div>
        </div>
        <div ref={ref} />
      </div>
      <Modal
        title={symbol}
        centered
        visible={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={null}
        width={800}
      >
        <Settings state={ticker.state} name={symbol} />
      </Modal>
      <Modal
        centered
        visible={acceptVisible}
        onOk={() => ticker?.disable?.()}
        onCancel={() => setAcceptVisible(false)}
        okText="Да"
        cancelText="Отмена"
      >
        <div>
          Отключить {symbol}?
        </div>
      </Modal>
    </>
  );
};
