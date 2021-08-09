import {useCallback, useEffect, useState} from 'react';

import './App.css';
import {Chart, CommonSettings, Favorites} from './components';
import {State} from './model/State';

export const App = () => {
  const [stateWrapper, setStateWrapper] = useState({});
  const {state} = stateWrapper;

  const dispatch = useCallback((state) => {
    setStateWrapper({state});
  }, []);

  useEffect(() => {
    if (!state) {
      setStateWrapper({state: new State({dispatch})});
    }
  }, [state, dispatch]);


  return <div
    className="charts"
    style={{paddingBottom: state?.favoritesHeight ? state.favoritesHeight + 10 + 'px'  : '20px'}}
  >
    {state?.tickerNames?.map((ticker) => <Chart ticker={state.tickers[ticker]} key={ticker} />)}
    {state?.config ? <CommonSettings state={state} /> : null}
    <Favorites state={state} />
  </div>;
};
