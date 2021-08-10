import s from './Chart.module.scss';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Modal} from 'antd';
import {Settings} from '../Settings/Settings';
import {CloseOutlined, PoweroffOutlined, SettingOutlined, StarFilled, StarOutlined} from '@ant-design/icons';
import {Loader} from '../Loader/Loader';

export const Chart = (props) => {
  const ref = useRef();
  const {ticker} = props;
  const {name: symbol, state} = ticker;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [acceptVisible, setAcceptVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chart, setChart] = useState(false);
  const {width, height} = useMemo(() => {
    let width = (state?.width || 400);
    let height = (width - 2) * 0.7 + 32;
    width = width + 'px';
    if (height > window.innerHeight) {
      height = window.innerHeight - 12;
    }
    height = height + 'px';
    return {width, height};
  }, [state?.width]);

  const favorite = ticker?.state?.favorites?.some((name) => name === ticker.name);

  useEffect(() => {
    ticker.createChart(ref.current);
    ticker.enableChart(false);
  }, [ticker]);

  // useEffect(() => {
  //   ticker.createChartTest(ref.current);
  // }, [ticker]);

  // useEffect(() => {
  //   ticker.updateUI$.subscribe((update) => {
  //     if (update?.chart) {
  //       setLoading(false);
  //     }
  //   });
  // }, [ticker]);

  useEffect(() => {
    ticker.updateUI$.subscribe((update) => {
        if (update?.series) {
          setLoading(false);
        }
      });
  }, [ticker]);

  const addFavorite = () => {
    if (favorite) {
      ticker.state.favorites = ticker.state.favorites.filter((name) => name !== ticker?.name);
    } else {
      if (ticker?.state?.favorites) {
        ticker.state.favorites = [...ticker.state.favorites, ticker.name].sort();
      }
    }
    ticker?.state?.dispatch(ticker.state);
  };

  const enableChart = () => {
    ticker?.enableChart(!chart);
    setChart(!chart);
  }

  return (
    <>
      <div className={s.chart} id={symbol} style={{width, height}}>
        <div className={s.header}>
          <span>{symbol}</span>
          <div className={s.controls}>
            {favorite
              ? <StarFilled
                onClick={addFavorite}
                title="Удалить из избранного"
              />
              : <StarOutlined
                onClick={addFavorite}
                title="Добавить в избранное"
              />
            }
            <PoweroffOutlined
              onClick={enableChart}
              title={`${chart ? 'Выключить' : 'Включить'} управление`}
              style={{color: chart ? 'black' : 'gray'}}
            />
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
        {/*<div ref={ref} style={{display: 'flex', flex: '1 1', height: '400px'}}/>*/}
        <Loader loading={loading} />
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
