import s from './Chart.module.scss';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Modal, Tooltip} from 'antd';
import {Settings} from '../Settings/Settings';
import {CloseOutlined, PoweroffOutlined, SettingOutlined, StarFilled, StarOutlined} from '@ant-design/icons';
import {Loader} from '../Loader/Loader';

export const Chart = (props) => {
  const chartRef = useRef();
  const chartContainerRef = useRef();
  const {ticker} = props;
  const {name: symbol, state} = ticker || {};
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [acceptVisible, setAcceptVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chart, setChart] = useState(false);
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
            <span title="5м график" className={s.title}>{symbol}</span>
            {ticker?.averageVolumeAsString ? <Tooltip title={`Средний объем за последние (${last5mCount}) пятиминутные периоды`}>
              <span>{ticker?.averageVolumeAsString}</span>
            </Tooltip> : null}
            {average ? <Tooltip title="Средний объем за все загруженные пятиминутные периоды">
              <span>{average}</span>
            </Tooltip> : null}
            {highVolume ? <Tooltip title="Текущий повышенный объем">
              <span className={s.highVolume}>{highVolume}</span>
            </Tooltip> : null}
          </div>
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
