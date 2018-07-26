import fullAtomic from './full-atomic';
import progress from './progress';

export default {
  fullAtomic: fullAtomic.run,
  verbose() {
    progress.enable();
  },
};
