import {Button} from 'antd';
import {CloseOutlined} from '@ant-design/icons';
import {useEffect, useRef} from 'react';

import s from './Favorites.module.scss';

export const Favorites = (props) => {
  const {state} = props;
  const ref = useRef();

  useEffect(() => {
    if (state && ref.current && state.favorites.length) {
      state.favoritesHeight = ref.current.clientHeight;
      state.dispatch(state);
    } else if (state?.favoritesHeight) {
      state.favoritesHeight = 0;
      state.dispatch(state);
    }
  }, [ref, state, state?.favorites?.length]);

  const goTo = (name) => () => {
    // window.location.href = `/#${name}`;
    const chart = state?.tickers?.[name]?.chartContainer;
    if (chart) {
      chart.scrollIntoView({behavior: 'smooth'});
      chart.classList.add(s.blinkChartBorder);
      setTimeout(() => {
        chart.classList.remove(s.blinkChartBorder);
      }, 3000);
    }
  };

  const remove = (name) => (e) => {
    e.stopPropagation();
    if (state.favorites) {
      state.favorites = state.favorites.filter((n) => n !== name);
      state?.dispatch(state);
    }
  };

  return state?.favorites?.length ? <div className={s.favorites} ref={ref}>
    {state.favorites.map((name) => <div key={name} className={s.favorite}>
      <Button shape="round" size="small" onClick={goTo(name)}>
        {name}
        <CloseOutlined
          onClick={remove(name)}
          className={s.remove}
          title="Удалить из избранного"
        />
      </Button>
    </div>)}
  </div> : null;
};
