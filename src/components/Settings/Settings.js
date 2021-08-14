import {InfoCircleOutlined} from '@ant-design/icons';
import {Button, Form, Input, Radio, Tooltip} from 'antd';
import {isEqual} from 'lodash';

import s from './Settings.module.scss';
import {useEffect, useMemo, useRef, useState} from 'react';
import {defaultConfig} from '../../model/Settings';
import {getShorted} from '../../model/Ticker';

export const Settings = (props) => {
  const {state, name} = props;
  const [config, setConfig] = useState();
  const [disabled, setDisabled] = useState(true);
  const [resetDisabled, setResetDisabled] = useState(false);
  const [minOrder, setMinOrder] = useState('');
  const formRef = useRef();

  const tickerConfig = name ? state.tickers[name].config.map : null;
  const averageVolume = name ? Math.round(state.tickers[name].averageVolume) : null;
  const averageVolumeAsString = name ? state.tickers[name].averageVolumeAsString : null;
  const minOrderVolume = tickerConfig ? Math.round(averageVolume * tickerConfig?.minOrderPercentage) : null;
  const clientWidth = state?.clientWidth;

  const columnCounts = useMemo(() => {
    const counts = [1];
    if (clientWidth) {
      let i = 2;
      while ((clientWidth - 12 * i) / i > 400) {
        counts.push(i);
        i++;
      }
    }
    return counts;
  }, [clientWidth]);

  useEffect(() => {
    let minOrder = '';
    if (minOrderVolume) {
      minOrder = getShorted(minOrderVolume);
      if (name && state.tickers[name]?.closePrice) {
        minOrder += ` ($${getShorted(minOrderVolume * state.tickers[name].closePrice)})`;
      }
      setMinOrder(minOrder);
    }
  }, [minOrderVolume, name, state.tickers]);

  useEffect(() => {
    if (name) {
      setResetDisabled(isEqual(state.config.map, tickerConfig));
    } else {
      setResetDisabled(isEqual(state.config.map, defaultConfig));
    }
  }, [name, state.config.map, tickerConfig]);

  useEffect(() => {
    if (state.config.map) {
      const newConfig = {...state.config.map};
      formRef.current?.setFieldsValue(newConfig);
      setConfig(newConfig);
    }
  }, [state.config.map]);

  useEffect(() => {
    if (tickerConfig) {
      const newConfig = {...tickerConfig};
      formRef.current?.setFieldsValue(newConfig);
      setConfig(newConfig);
    }
  }, [tickerConfig]);

  const onFinish = (values) => {
    const newConfig = {};
    Object.keys(values).forEach((name) => {
      newConfig[name] = Number(values[name]);
    });
    if (name && state?.tickers?.[name]?.config) {
      state.tickers[name].config.update(newConfig);
    } else if (state.config) {
      state.config.update(newConfig);
    }
    setDisabled(true);
    state?.dispatch?.(state);
  };

  const onValuesChange = ({minOrderPercentage}) => {
    if (minOrderPercentage && averageVolume) {
      const minOrderVolume = averageVolume * Number(minOrderPercentage);
      let minOrder = '';
      if (minOrderVolume) {
        minOrder = getShorted(minOrderVolume);
        if (name && state.tickers[name]?.closePrice) {
          minOrder += ` ($${getShorted(minOrderVolume * state.tickers[name].closePrice)})`;
        }
        setMinOrder(minOrder);
      }
    }
  };

  const reset = () => {
    let newConfig;
    if (name) {
      state.tickers[name]?.config?.reset();
      newConfig = state.tickers[name]?.config?.map;
    } else {
      state.config?.reset();
      newConfig = state.config?.map;
    }
    if (newConfig) {
      setConfig(newConfig);
      formRef.current?.setFieldsValue(newConfig);
    }
    state?.dispatch?.(state);
  };

  return config ? (
    <div className={s.settings}>
      {averageVolume ? <div>
        <div>Средний объем {averageVolumeAsString}</div>
        <div>Минимальный ордер {minOrder}</div>
      </div> : null}
      <Form
        ref={formRef}
        initialValues={config}
        onFinish={onFinish}
        onFieldsChange={(e) => {
          setDisabled(false)
        }}
        onValuesChange={onValuesChange}
      >
        {!name && columnCounts.length > 1
          ? <Form.Item
            name="columnCount"
            label="Графиков в ширину"
          >
            <Radio.Group>
              {columnCounts.map((n) => <Radio.Button value={n} key={n}>{n}</Radio.Button>)}
            </Radio.Group>
          </Form.Item>
          : null}
        <Form.Item name="priceDistance">
          <Input
            addonBefore="Расстояние до уровня или ордера"
            suffix={
              <Tooltip title="Минимальное расстояние от текущей цены до ближайшего часового или дневного уровня или лимитного ордера в долях единицы от цены, чтоб сработало уведомление">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="minLevelAge">
          <Input
            addonBefore="Возраст уровня"
            suffix={
              <Tooltip title="Не уведомлять о приближении цены к уровням младше указанного возраста в часах (возможно дробное значение через точку)">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="hourlyDelta">
          <Input
            addonBefore="Расстояние между часовыми уровнями"
            suffix={
              <Tooltip title="Минимальное количество интервалов между двумя уровнями">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="dailyDelta">
          <Input
            addonBefore="Расстояние между дневными уровнями"
            suffix={
              <Tooltip title="Минимальное количество интервалов между двумя уровнями">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="minOrderPercentage">
          <Input
            addonBefore="Размер лимитного ордера"
            suffix={
              <Tooltip title="Доля от среднего объема торгов за последние N 5-минуток (за исключением последней не закрытой), если размер лимитной заявки больше вычисленного объема, то он отобразится на графике. Если на графике слишком много лимитных заявок, возможно стоит увеличить значение.">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="orderTimeout">
          <Input
            addonBefore="Таймаут лимитного ордера"
            suffix={
              <Tooltip title="Если ордер старше указанного количества минут, он отобразится на графике (возможны дробные значения через точку)">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="last5mCount">
          <Input
            addonBefore="Количество 5-минуток для среднего объема"
            suffix={
              <Tooltip title="Сколько последних 5-минуток использовать для вычисления среднего объема для сравнения с объемом лимитного ордера">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="averageVolumeMultiplier">
          <Input
            addonBefore="Коэффициент среднего объема"
            suffix={
              <Tooltip title="Используется для уведомлений о повышенных объемах. Объем текущего пятиминутного интервала сравнивается со средним объемом умноженным на данный коэффициент.">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="notificationTimeout">
          <Input
            addonBefore="Таймаут уведомлений в минутах"
            suffix={
              <Tooltip title="Время в минутах, в течение которого не уведомлять о монете">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            disabled={disabled}
            className={s.button}
          >
            Сохранить
          </Button>
          <Button
            type="default"
            onClick={reset}
            disabled={resetDisabled}
            className={s.button}
          >
            Сбросить
          </Button>
        </Form.Item>
      </Form>
    </div>
  ) : <div>Загрузка данных...</div>;
};
