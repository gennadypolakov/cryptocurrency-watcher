import s from './Chart.module.scss';
import {useEffect, useRef} from 'react';

export const Chart = (props) => {
  const ref = useRef();
  const {ticker} = props;
  const {name: symbol} = ticker;

  useEffect(() => {
    ticker.createChart(ref.current);
  }, []);

  return (
    <div className={s.chart} id={symbol}>
      <div>{symbol}</div>
      <div ref={ref} />
    </div>
  );
};
