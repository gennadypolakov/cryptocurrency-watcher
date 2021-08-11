import {useCallback, useEffect, useRef, useState} from 'react';

import './App.css';
import {Chart, CommonSettings, Favorites} from './components';
import {State} from './model/State';
import {Loader} from './components/Loader/Loader';

export const App = () => {
  const ref = useRef();
  const [stateWrapper, setStateWrapper] = useState({});
  const [height, setHeight] = useState();
  const {state} = stateWrapper;

  const dispatch = useCallback((state) => {
    setStateWrapper({state});
  }, []);

  useEffect(() => {
    if (!state) {
      setStateWrapper({state: new State(dispatch)});
    }
  }, [state, dispatch]);

  useEffect(() => {
    if (height) {
      if (!state?.width) {
        state?.setWidth(ref.current.clientWidth);
        ref.current.style.height = 'auto';
      }
    } else {
      if (ref.current) {
        ref.current.style.height = ref.current.clientHeight + 10 + 'px';
        setHeight(ref.current.clientHeight + 10);
      }
    }
  }, [height, state]);

  return <div
    className="charts"
    style={{paddingBottom: state?.favoritesHeight ? state.favoritesHeight + 10 + 'px'  : '20px'}}
    ref={ref}
  >
    {state?.tickerNames?.map((ticker) => <Chart ticker={state.tickers[ticker]} key={ticker} />)}
    <Loader loading={!state?.tickerNames} />
    {state?.config ? <CommonSettings state={state} /> : null}
    <Favorites state={state} />
  </div>;
};
