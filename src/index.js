import fullAtomic from './full-atomic';
import _ from 'lodash';
import client from './client';

export default function(credentials) {
  const appId = _.get(credentials, 'appId');
  const apiKey = _.get(credentials, 'apiKey');
  const superClient = client(appId, apiKey);

  return {
    fullAtomic: fullAtomic(superClient),
  };
}
