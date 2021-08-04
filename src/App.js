import {useCallback, useEffect, useState} from 'react';

import './App.css';
import {Chart, CommonSettings} from './components';
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


  return <div className="charts">
    {state?.tickerNames?.map((ticker) => <Chart ticker={state.tickers[ticker]} key={ticker} />)}
    {state?.priceNearLevel?.length ? <div className="check">
      {state.priceNearLevel.map((ticker) => <div key={ticker.name} className="symbol">
        <a
          href={`#${ticker.name}`}
          className={ticker.checked ? 'checked' : 'notChecked'}
          onClick={() => ticker.click()}
        >{ticker.name}</a>
        <span onClick={() => ticker.remove()}>X</span>
      </div>)}
    </div> : null}
    {state?.config ? <CommonSettings state={state} /> : null}
  </div>;
};
