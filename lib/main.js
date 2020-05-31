const fullAtomic = require('./fullAtomic.js');
const progress = require('./progress.js');
const config = require('./config.js');

module.exports = {
  async fullAtomic(credentials, records, settings) {
    await fullAtomic.run(credentials, records, settings);
  },
  verbose() {
    progress.enable();
  },
  config(newConfig) {
    config.update(newConfig);
  },
};
