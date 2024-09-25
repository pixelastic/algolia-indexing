import fullAtomic from './fullAtomic.js';
import progress from './progress.js';
import config from './config.js';
import { pulse } from 'firost';

export default {
  async fullAtomic(credentials, records, settings) {
    await fullAtomic.run(credentials, records, settings);
  },
  verbose() {
    progress.enable();
  },
  config(newConfig) {
    config.update(newConfig);
  },
  pulse,
};
