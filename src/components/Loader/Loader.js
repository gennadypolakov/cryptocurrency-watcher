import {Spin} from 'antd';

import s from './Loader.module.scss';

export const Loader = (props) => {
  const {loading} = props;
  return loading ? <div className={s.loader}><Spin /></div> : null;
}
