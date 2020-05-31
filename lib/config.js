module.exports = {
  config: {
    batchMaxSize: 100, // How many operations to we execute in one batch
    batchMaxConcurrency: 10, // How many batches do we run in parallel
  },
  read(key) {
    return this.config[key];
  },
  update(newConfig) {
    this.config = { ...this.config, ...newConfig };
  },
};
