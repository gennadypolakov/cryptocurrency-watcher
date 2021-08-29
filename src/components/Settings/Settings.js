import {InfoCircleOutlined} from '@ant-design/icons';
import {Button, Form, Input, Radio, Switch, Tooltip} from 'antd';
import {isEqual} from 'lodash';

import s from './Settings.module.scss';
import {useEffect, useMemo, useRef, useState} from 'react';
import {defaultConfig} from '../../model/Settings';
import {getShorted} from '../../model/Ticker';

export const Settings = (props) => {
  const {lang, name, state} = props;
  const [config, setConfig] = useState();
  const [disabled, setDisabled] = useState(true);
  const [resetDisabled, setResetDisabled] = useState(false);
  const [minOrder, setMinOrder] = useState('');
  const [autoScroll, setAutoScroll] = useState();
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
    if (tickerConfig) {
      const newConfig = {...tickerConfig};
      formRef.current?.setFieldsValue(newConfig);
      setConfig(newConfig);
    } else if (state?.config?.map) {
      const newConfig = {...state.config.map};
      formRef.current?.setFieldsValue(newConfig);
      setConfig(newConfig);
      setAutoScroll(state.config.autoScroll)
    }
  }, [state, state.config.map, tickerConfig]);

  const onFinish = (values) => {
    const newConfig = {};
    Object.keys(values).forEach((name) => {
      newConfig[name] = Number(values[name]);
    });
    if (name && state?.tickers?.[name]?.config) {
      state.tickers[name].config.update(newConfig);
    } else if (state.config) {
      newConfig.autoScroll = autoScroll;
      if (!autoScroll) {
        newConfig.autoScrollTimeout = state.config.autoScrollTimeout;
      }
      state.config.update(newConfig);
    }
    setDisabled(true);
    state?.dispatch?.(state);
  };

  const onValuesChange = ({autoScroll, minOrderPercentage}) => {
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
    if (autoScroll !== undefined) {
      setAutoScroll(autoScroll);
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
        <div>{lang?.averageVolume} {averageVolumeAsString}</div>
        <div>{lang?.minOrder} {minOrder}</div>
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
            label={lang?.columnCount}
          >
            <Radio.Group>
              {columnCounts.map((n) => <Radio.Button value={n} key={n}>{n}</Radio.Button>)}
            </Radio.Group>
          </Form.Item>
          : null}
        <Form.Item name="priceDistance">
          <Input
            addonBefore={lang?.priceDistance}
            suffix={
              <Tooltip title={lang?.priceDistanceDesc}>
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="minLevelAge">
          <Input
            addonBefore={lang?.minLevelAge}
            suffix={
              <Tooltip title={lang?.minLevelAgeDesc}>
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="hourlyDelta">
          <Input
            addonBefore={lang?.hourlyDelta}
            suffix={
              <Tooltip title={lang?.hourlyDeltaDesc}>
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="fourHoursDelta">
          <Input
            addonBefore={lang?.fourHoursDelta}
            suffix={
              <Tooltip title={lang?.fourHoursDeltaDesc}>
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="dailyDelta">
          <Input
            addonBefore={lang?.dailyDelta}
            suffix={
              <Tooltip title={lang?.dailyDeltaDesc}>
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="minOrderPercentage">
          <Input
            addonBefore={lang?.minOrderPercentage}
            suffix={
              <Tooltip title={lang?.minOrderPercentageDesc}>
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="orderTimeout">
          <Input
            addonBefore={lang?.orderTimeout}
            suffix={
              <Tooltip title={lang?.orderTimeoutDesc}>
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="last5mCount">
          <Input
            addonBefore={lang?.last5mCount}
            suffix={
              <Tooltip title={lang?.last5mCountDesc}>
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="averageVolumeMultiplier">
          <Input
            addonBefore={lang?.averageVolumeMultiplier}
            suffix={
              <Tooltip title={lang?.averageVolumeMultiplierDesc}>
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        <Form.Item name="notificationTimeout">
          <Input
            addonBefore={lang?.notificationTimeout}
            suffix={
              <Tooltip title={lang?.notificationTimeoutDesc}>
                <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
              </Tooltip>
            }
          />
        </Form.Item>
        {!name ?
          <>
            <Form.Item label={lang?.autoScroll} name="autoScroll" valuePropName="checked">
              <Switch/>
            </Form.Item>
            {autoScroll ? <Form.Item name="autoScrollTimeout">
              <Input
                addonBefore={lang?.autoScrollTimeout}
                suffix={
                  <Tooltip title={lang?.autoScrollTimeoutDesc}>
                    <InfoCircleOutlined style={{color: 'rgba(0,0,0,.45)'}}/>
                  </Tooltip>
                }
              />
            </Form.Item> : null}
          </>
          : null}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            disabled={disabled}
            className={s.button}
          >
            {lang?.save}
          </Button>
          <Button
            type="default"
            onClick={reset}
            disabled={resetDisabled}
            className={s.button}
          >
            {lang?.reset}
          </Button>
        </Form.Item>
      </Form>
    </div>
  ) : <div>{lang?.loading}</div>;
};
