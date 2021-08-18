import s from './Chart.module.scss';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Modal, Tooltip} from 'antd';
import {Settings} from '../Settings/Settings';
import {CloseOutlined, PoweroffOutlined, SettingOutlined, StarFilled, StarOutlined} from '@ant-design/icons';
import {Loader} from '../Loader/Loader';
import {D1, H1, M5} from '../../constants';

const intervals = [M5, H1, D1];

export const Chart = (props) => {
  const chartRef = useRef();
  const chartContainerRef = useRef();
  const {ticker, lang} = props;
  const {name: symbol, state} = ticker || {};
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [acceptVisible, setAcceptVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chart, setChart] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(M5);
  const {width, height} = useMemo(() => {
    let width = (state?.width || 400);
    let height = (width - 2) * 0.7 + 32;
    width += 'px';
    const favoritesHeight = state?.favoritesHeight || 0;
    if (height - favoritesHeight > window.innerHeight) {
      height = window.innerHeight - 12 - state?.favoritesHeight;
    }
    height += 'px';
    return {width, height};
  }, [state?.favoritesHeight, state?.width]);


  const favorite = ticker?.state?.favorites?.some((name) => name === ticker.name);
  const last5mCount = ticker?.config?.last5mCount;
  const {average, highVolume} = ticker?.getVolumes();

  useEffect(() => {
    if (ticker) {
      ticker.chartContainer = chartContainerRef.current;
    }
    return () => {
      if (ticker.chartContainer) {
        delete ticker.chartContainer;
      }
    };
  }, [ticker]);

  useEffect(() => {
    ticker.createChart(chartRef.current);
    ticker.enableChart(false);
  }, [ticker]);

  useEffect(() => {
    ticker.updateUI$.subscribe((update) => {
        if (update?.series) {
          setLoading(false);
        }
      });
  }, [ticker]);

  const setInterval = (interval) => () => {
    ticker?.setInterval(interval);
    setCurrentInterval(interval);
  };

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

  const onMouseEnter = () => {
    if (ticker) {
      ticker.state.mouseOn = ticker.name;
    }
  }

  const onMouseLeave = () => {
    if (ticker) {
      ticker.state.mouseOn = null;
    }
  }

  return (
    <>
      <div
        className={s.chart}
        id={symbol}
        ref={chartContainerRef}
        style={{width, height}}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className={s.header}>
          <div className={s.info}>
            <span title={`5m ${lang?.chart}`} className={s.title}>{symbol}</span>
            <div className={s.intervals}>{intervals.map((i) => (
              <span
                className={i === currentInterval ? s.currentInterval : ''}
                key={i}
                onClick={setInterval(i)}
              >
                {i}
              </span>
            ))}</div>
            {ticker?.averageVolumeAsString ? <Tooltip title={lang?.last5mAverageVolume(last5mCount)}>
              <span>{ticker?.averageVolumeAsString}</span>
            </Tooltip> : null}
            {average ? <Tooltip title={lang?.allTimeAverageVolume}>
              <span>{average}</span>
            </Tooltip> : null}
            {highVolume ? <Tooltip title={lang?.currentHighVolume}>
              <span className={s.highVolume}>{highVolume}</span>
            </Tooltip> : null}
          </div>
          <div className={s.controls}>
            {favorite
              ? <StarFilled
                onClick={addFavorite}
                title={lang?.removeFavorite}
              />
              : <StarOutlined
                onClick={addFavorite}
                title={lang?.addFavorite}
              />
            }
            <PoweroffOutlined
              onClick={enableChart}
              title={`${chart ? lang?.disable : lang?.enable} ${lang?.chart}`}
              style={{color: chart ? 'black' : 'gray'}}
            />
            <SettingOutlined
              onClick={() => setSettingsVisible(v => !v)}
              title={lang?.coinSettings}
            />
            <CloseOutlined
              onClick={() => setAcceptVisible(v => !v)}
              title={lang?.close}
            />
          </div>
        </div>
        <div ref={chartRef} />
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
        <Settings state={ticker.state} name={symbol} lang={lang} />
      </Modal>
      <Modal
        centered
        visible={acceptVisible}
        onOk={() => ticker?.disable?.()}
        onCancel={() => setAcceptVisible(false)}
        okText={lang?.ok}
        cancelText={lang?.cancel}
      >
        <div>
          {lang?.disable} {symbol}?
        </div>
      </Modal>
    </>
  );
};
