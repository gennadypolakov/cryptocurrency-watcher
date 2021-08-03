import {Checkbox} from 'antd';
import {useEffect, useState} from 'react';

import s from './Tickers.module.scss';

export const Tickers = (props) => {
  const {state} = props;
  const [tickerNames, setTickerNames] = useState();

  useEffect(() => {
    if (state?.config?.tickers) {
      setTickerNames(Object.keys(state.config.tickers).sort());
    }
  }, [state?.config?.tickers]);

  const onChange = (name) => (e) => {
    if (name === 'all') {
      tickerNames?.forEach?.((name) => {
        if (state?.config?.tickers?.[name]) {
          state.config.tickers[name].isActive = e?.target?.checked;
        }
      });
    } else {
      if (state?.config?.tickers?.[name]) {
        state.config.tickers[name].isActive = e?.target?.checked;
      }
    }
    state?.config?.save?.();
    state?.updateTickers();
  };

  return <div className={s.tickers}>
    {tickerNames?.length
      ? <>
        <div key="all"><Checkbox onChange={onChange('all')}>выбрать все</Checkbox></div>
        {tickerNames.map((name) => <div key={name}>
          <Checkbox
            onChange={onChange(name)}
            checked={state.config.tickers[name].isActive}
          >{name}</Checkbox>
        </div>)}
      </>
      : <div>Данные загружаются...</div>}
  </div>;
};
