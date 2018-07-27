import fullAtomic from './full-atomic';
import progress from './progress';
import config from './config';

export default {
  fullAtomic: fullAtomic.run,
  verbose() {
    progress.enable();
  },
  config(newConfig) {
    config.update(newConfig);
  },
};
