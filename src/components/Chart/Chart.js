import s from './Chart.module.scss';
import {useEffect, useRef, useState} from 'react';
import {Modal, Tabs} from 'antd';
import {Tickers} from '../Tickers/Tickers';
import {Settings} from '../Settings/Settings';

export const Chart = (props) => {
  const ref = useRef();
  const {ticker} = props;
  const {name: symbol} = ticker;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    ticker.createChart(ref.current);
  }, []);

  return (
    <>
      <div className={s.chart} id={symbol}>
        <div onClick={() => setVisible(true)}>{symbol}</div>
        <div ref={ref} />
      </div>
      <Modal
        title={symbol}
        centered
        visible={visible}
        onOk={() => setVisible(false)}
        onCancel={() => setVisible(false)}
        footer={null}
        width={800}
      >
        <Settings state={ticker.state} name={symbol} />
      </Modal>
    </>
  );
};
