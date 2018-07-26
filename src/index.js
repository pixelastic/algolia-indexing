import fullAtomic from './full-atomic';
import _ from 'lodash';
import pulse from './pulse';

export default {
  fullAtomic: fullAtomic.run,
  on: _.bind(pulse.on, pulse),
  onAny: _.bind(pulse.onAny, pulse),
};
