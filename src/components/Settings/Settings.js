import {InfoCircleOutlined} from '@ant-design/icons';
import {Button, Form, Input, Tooltip} from 'antd';

import s from './Settings.module.scss';
import {useEffect, useState} from 'react';

export const Settings = (props) => {
  const {state, name} = props;
  const [config, setConfig] = useState();
  const [disabled, setDisabled] = useState(true);

  const setStateConfig = (name) => {
    if (name) {
      if (state?.tickers?.[name]?.config) {
        setConfig({...state.tickers[name].config});
      }
    } else if (state.config) {
      setConfig({...state.config});
    }
  };

  useEffect(() => {
    if (!config) {
      setStateConfig(name);
    }
  }, [name, state]);

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

  return config ? (
    <div className={s.settings}>
      <Form
        initialValues={config}
        onFinish={onFinish}
        onFieldsChange={() => setDisabled(false)}
      >
        <Form.Item name="priceDistance">
          <Input
            addonBefore="Расстояние до уровня"
            suffix={
              <Tooltip title="Минимальное расстояние от текущей цены до ближайшего часового или дневного уровня в долях от единицы, чтоб сработало уведомление">
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
              <Tooltip title="Сколько последних 5-минуток использовать для вычисления среднего объема">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="notificationTimeout">
          <Input
            addonBefore="Таймаут уведомлений в минутах"
            suffix={
              <Tooltip title="Время в минутах, в течение которого не уведомлять о выключенной монете">
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" disabled={disabled}>
            Сохранить
          </Button>
        </Form.Item>
      </Form>
    </div>
  ) : <div>Загрузка данных...</div>;
};
