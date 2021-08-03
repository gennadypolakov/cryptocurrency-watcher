import {useState} from 'react';
import {InfoCircleOutlined, SettingOutlined} from '@ant-design/icons';
import {Input, Modal, Tooltip} from 'antd';
import {Tabs} from 'antd';

import s from './CommonSettings.module.scss';
import {Settings} from '../Settings/Settings';
import {Tickers} from '../Tickers/Tickers';

const {TabPane} = Tabs;

export const CommonSettings = (props) => {
  const {state} = props;
  const [visible, setVisible] = useState(false);

  const onCancel = () => setVisible(v => !v);

  return <div className={s.settings}>
    <SettingOutlined className={s.settingsIcon} onClick={() => setVisible(v => !v)}/>
    <Modal
      title="Общие настройки"
      centered
      visible={visible}
      onOk={() => setVisible(false)}
      onCancel={() => setVisible(false)}
      footer={null}
      width={800}
    >
      <Tabs defaultActiveKey="1">
        <TabPane tab="Монеты" key="1">
          <Tickers state={state} />
        </TabPane>
        <TabPane tab="Настройки" key="2">
          <Settings state={state} />
        </TabPane>
      </Tabs>
    </Modal>
  </div>;
};
