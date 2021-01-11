const pulse = require('firost/pulse');
const chalk = require('golgoth/chalk');
const spinner = require('firost/spinner');
const _ = require('golgoth/lodash');

module.exports = {
  // Spinner-related method. Keeping a list of running spinners and
  // starting/stopping them with a clear API
  spinners: {},
  spinnerStart(eventId, text) {
    this.spinners[eventId] = spinner().tick(text);
  },
  spinnerTick(eventId, text) {
    this.spinners[eventId].tick(text);
  },
  spinnerSuccess(eventId, userText) {
    const thisSpinner = this.spinners[eventId];

    // Succeed with same text if none is set
    let text = userText;
    if (!text) {
      text = thisSpinner.spinner.text;
    }

    thisSpinner.success(text);
  },
  spinnerFailure(eventId, text) {
    this.spinners[eventId].failure(text);
  },
  failAllSpinners() {
    _.each(this.spinners, (thisSpinner) => {
      thisSpinner.failure('Stopping all indexing');
    });
  },
  // Generic handler in case of success and failure
  eventSuccess(data) {
    const { eventId } = data;
    this.spinnerSuccess(eventId);
  },
  eventError(data) {
    const { eventId, message } = data;
    this.spinnerFailure(eventId, chalk.red(message));
  },
  /**
   * Return a color for a given index name
   * @param {string} indexName name of the index
   * @returns {Function} chalk function to convert to color
   **/
  coloredIndexname(indexName) {
    if (indexName.endsWith('_manifest_tmp')) {
      return chalk.yellow.dim(indexName);
    }
    if (indexName.endsWith('_manifest')) {
      return chalk.yellow.bold(indexName);
    }
    if (indexName.endsWith('_tmp')) {
      return chalk.blue.dim(indexName);
    }
    return chalk.blue.bold(indexName);
  },
  /**
   * Enable display of progress indicators at various stages of the indexing
   **/
  enable() {
    pulse.on('error', (error) => {
      this.eventError(error);
    });
    pulse.on('globalError', () => {
      this.failAllSpinners();
    });
    pulse.on('*.end', (event) => {
      this.eventSuccess(event);
    });
    pulse.on('copyIndex.start', ({ eventId, source, destination }) => {
      const coloredSource = this.coloredIndexname(source);
      const coloredDestination = this.coloredIndexname(destination);
      const text = `Copying ${coloredSource} to ${coloredDestination}`;
      this.spinnerStart(eventId, text);
    });
    pulse.on('setSettings.start', ({ eventId, indexName }) => {
      const coloredIndex = this.coloredIndexname(indexName);
      const text = `Updating settings of ${coloredIndex}`;
      this.spinnerStart(eventId, text);
    });
    pulse.on('getAllRecords.start', ({ eventId, indexName }) => {
      const coloredIndex = this.coloredIndexname(indexName);
      const text = `Getting all records from ${coloredIndex}`;
      this.spinnerStart(eventId, text);
    });
    pulse.on(
      'batch.start',
      ({ eventId, maxOperationCount, currentOperationCount }) => {
        const text = `Running batch [${currentOperationCount}/${maxOperationCount}]`;
        this.spinnerStart(eventId, text);
      }
    );
    pulse.on(
      'batch.chunk',
      ({ eventId, maxOperationCount, currentOperationCount }) => {
        const text = `Running batch [${currentOperationCount}/${maxOperationCount}]`;
        this.spinnerTick(eventId, text);
      }
    );
    pulse.on('clearIndex.start', ({ eventId, indexName }) => {
      const coloredIndex = this.coloredIndexname(indexName);
      const text = `Clearing index ${coloredIndex}`;
      this.spinnerStart(eventId, text);
    });
    pulse.on('moveIndex.start', ({ eventId, source, destination }) => {
      const coloredSource = this.coloredIndexname(source);
      const coloredDestination = this.coloredIndexname(destination);
      const text = `Moving ${coloredSource} to ${coloredDestination}`;
      this.spinnerStart(eventId, text);
    });
    pulse.on('configureReplicas.start', ({ eventId, indexName }) => {
      const coloredIndex = this.coloredIndexname(indexName);
      const text = `Configuring replicas of ${coloredIndex}`;
      this.spinnerStart(eventId, text);
    });
  },
};
