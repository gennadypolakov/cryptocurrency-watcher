import s from './Chart.module.scss';
import {useEffect, useRef, useState} from 'react';
import {Modal} from 'antd';
import {Settings} from '../Settings/Settings';
import {CloseOutlined, SettingOutlined, StarFilled, StarOutlined} from '@ant-design/icons';
import {Loader} from '../Loader/Loader';

export const Chart = (props) => {
  const ref = useRef();
  const {ticker} = props;
  const {name: symbol} = ticker;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [acceptVisible, setAcceptVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const favorite = ticker?.state?.favorites?.some((name) => name === ticker.name);

  useEffect(() => {

    ticker.createChart(ref.current);
  }, [ticker]);

  useEffect(() => {
    ticker.createChart(ref.current);
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

  return (
    <>
      <div className={s.chart} id={symbol}>
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
