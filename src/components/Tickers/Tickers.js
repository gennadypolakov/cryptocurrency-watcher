import {Checkbox} from 'antd';
import {useEffect, useState} from 'react';

import s from './Tickers.module.scss';
import {StarFilled} from '@ant-design/icons';

export const Tickers = (props) => {
  const {lang, state} = props;
  const [tickerNames, setTickerNames] = useState();

  const favorites = state?.favorites?.reduce((acc, name) => {acc[name] = true; return acc}, {});

  let checkedCount = 0;
  if (state?.config?.tickers) {
    checkedCount = Object.keys(state.config.tickers)
      .filter((k) => state.config.tickers[k].isActive).length;
  }
  const allChecked = checkedCount === tickerNames?.length;

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
        <div key="all"><Checkbox onChange={onChange('all')} checked={allChecked}>{lang?.selectAll}</Checkbox></div>
        {tickerNames.map((name) => <div key={name}>
          <Checkbox
            onChange={onChange(name)}
            checked={state.config.tickers[name].isActive}
          >
            {name}
            {favorites?.[name] ? <StarFilled style={{marginLeft: '3px'}} /> : null}
          </Checkbox>
        </div>)}
      </>
      : <div>{lang?.loading}</div>}
  </div>;
};
