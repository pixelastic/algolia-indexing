const fullAtomic = require('./fullAtomic.js');
const progress = require('./progress.js');
const config = require('./config.js');

module.exports = {
  fullAtomic: fullAtomic.run,
  verbose() {
    progress.enable();
  },
  config(newConfig) {
    config.update(newConfig);
  },
};
