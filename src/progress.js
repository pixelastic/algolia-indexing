import pulse from './pulse';
import _ from 'lodash';
import ora from 'ora';
import chalk from 'chalk';
import hashMod from 'hash-mod';

export default {
  spinners: {},
  indices: {},
  // Making sure the same string is always colored the same way
  color(indexName) {
    const ansi = hashMod(256)(indexName);
    return chalk.ansi256(ansi)(indexName);
  },
  startSpinner(id, text) {
    this.spinners[id] = ora(text).start();
  },
  succeedEvent(data) {
    this.spinners[data.eventId].succeed();
  },

  /* eslint-disable no-param-reassign */
  onCopyIndexStart(data) {
    this.startSpinner(
      data.eventId,
      `Copying ${this.color(data.source)} to ${this.color(data.destination)}`
    );
  },
  onMoveIndexStart(data) {
    this.startSpinner(
      data.eventId,
      `Moving ${this.color(data.source)} to ${this.color(data.destination)}`
    );
  },
  onSetSettingsStart(data) {
    this.startSpinner(
      data.eventId,
      `Pushing settings to ${this.color(data.indexName)}`
    );
  },
  onClearIndexStart(data) {
    this.startSpinner(
      data.eventId,
      `Clearing index ${this.color(data.indexName)}`
    );
  },
  onGetAllRecordsStart(data) {
    this.startSpinner(
      data.eventId,
      `Getting all objectIds from ${this.color(data.indexName)}`
    );
  },
  onGetAllRecordsPage(data) {
    const current = data.currentPage;
    const max = data.maxPages;
    const indexName = this.color(data.indexName);
    this.spinners[
      data.eventId
    ].text = `Getting all objectIds from ${indexName} [page ${current}/${max}]`;
  },
  onBatchStart(data) {
    const current = data.currentOperationCount;
    const max = data.maxOperationCount;
    this.startSpinner(
      data.eventId,
      `Running batch: [operation ${current}/${max}]`
    );
  },
  onBatchChunk(data) {
    const current = data.currentOperationCount;
    const max = data.maxOperationCount;
    this.spinners[
      data.eventId
    ].text = `Running batch: [operation ${current}/${max}]`;
  },

  /* eslint-enable no-param-reassign */
  enable() {
    pulse.on('copyIndex:start', _.bind(this.onCopyIndexStart, this));
    pulse.on('copyIndex:end', _.bind(this.succeedEvent, this));

    pulse.on('moveIndex:start', _.bind(this.onMoveIndexStart, this));
    pulse.on('moveIndex:end', _.bind(this.succeedEvent, this));

    pulse.on('clearIndex:start', _.bind(this.onClearIndexStart, this));
    pulse.on('clearIndex:end', _.bind(this.succeedEvent, this));

    pulse.on('getAllRecords:start', _.bind(this.onGetAllRecordsStart, this));
    pulse.on('getAllRecords:page', _.bind(this.onGetAllRecordsPage, this));
    pulse.on('getAllRecords:end', _.bind(this.succeedEvent, this));

    pulse.on('batch:start', _.bind(this.onBatchStart, this));
    pulse.on('batch:chunk', _.bind(this.onBatchChunk, this));
    pulse.on('batch:end', _.bind(this.succeedEvent, this));

    pulse.on('setSettings:start', _.bind(this.onSetSettingsStart, this));
    pulse.on('setSettings:end', _.bind(this.succeedEvent, this));
  },
};
