import algoliasearch from 'algoliasearch';
import _ from 'lodash';
import uuid from 'uuid/v1';
import pMap from 'p-map';
import pulse from './pulse';

const module = {
  QUOTAS: {
    batchMaxSize: 1000,
    batchMaxConcurrency: 10,
  },
  client: null,
  indexes: null,

  /**
   * Init the module with the Algolia credentials
   * @param {String} appId The application id
   * @param {String} apiKey The API key
   * @returns {Void}
   **/
  init(appId, apiKey) {
    this.client = algoliasearch(appId, apiKey);
    this.indexes = {};
  },

  /**
   * Return an index object from an indexName
   * @param {String} indexName Name of the index
   * @returns {Object} Algolia index object
   * Note: This is a wrapper around client.initIndex, but using a local cache
   **/
  initIndex(indexName) {
    const cacheHit = this.indexes[indexName];
    if (cacheHit) {
      return cacheHit;
    }

    const newIndex = this.client.initIndex(indexName);
    this.indexes[indexName] = newIndex;
    return newIndex;
  },

  /**
   * Clear an index and wait until it is cleaned
   * @param {String} indexName Name of the index to clean
   * @returns {Void}
   **/
  async clearIndexSync(indexName) {
    const eventId = uuid();
    pulse.emit('clearIndex:start', { eventId, indexName });
    try {
      const index = this.initIndex(indexName);
      const response = await index.clearIndex();
      await index.waitTask(response.taskID);
      pulse.emit('clearIndex:end', { eventId, indexName });
    } catch (err) {
      pulse.emit('error', {
        eventId,
        message: `Unable to clear index ${indexName}`,
      });
    }
  },

  /**
   * Create a copy of an existing index
   * @param {String} source Name of the source index
   * @param {String} destination Name of the destination index
   * @returns {Promise} Wait for the new index to be created
   **/
  async copyIndexSync(source, destination) {
    const eventId = uuid();
    pulse.emit('copyIndex:start', { eventId, source, destination });
    // If the source index does not exist, we simply create it. We can't copy an
    // empty index because we won't be able to wait for the task to finish.
    if (!await this.indexExists(source)) {
      await this.initIndex(source).setSettings({});
      pulse.emit('copyIndex:end', { eventId, source, destination });
      return;
    }
    try {
      const response = await this.client.copyIndex(source, destination);
      await this.initIndex(source).waitTask(response.taskID);
      pulse.emit('copyIndex:end', { eventId, source, destination });
    } catch (err) {
      pulse.emit('error', {
        eventId,
        message: `Unable to copy index ${source} to ${destination}`,
      });
    }
  },

  /**
   * Rename an existing index
   * @param {String} source Name of the source index
   * @param {String} destination Name of the destination index
   * @returns {Promise} Wait for the index to be renamed
   **/
  async moveIndexSync(source, destination) {
    const eventId = uuid();
    pulse.emit('moveIndex:start', { eventId, source, destination });
    // If the source index does not exist, we simply create a new one. We can't copy an
    // empty index because we won't be able to wait for the task to finish.
    if (!await this.indexExists(source)) {
      await this.initIndex(source).setSettings({});
      pulse.emit('moveIndex:end', { eventId, source, destination });
      return;
    }
    try {
      const response = await this.client.moveIndex(source, destination);
      await this.initIndex(source).waitTask(response.taskID);
      pulse.emit('moveIndex:end', { eventId, source, destination });
    } catch (err) {
      pulse.emit('error', {
        eventId,
        message: `Unable to move index ${source} to ${destination}`,
      });
    }
  },

  /**
   * Set settings to an index
   * @param {String} indexName Name of the index
   * @param {Object} settings Settings of the index
   * @returns {Void}
   **/
  async setSettingsSync(indexName, settings) {
    const eventId = uuid();
    pulse.emit('setSettings:start', { eventId, indexName, settings });
    try {
      const index = this.initIndex(indexName);
      const response = await index.setSettings(settings);
      await index.waitTask(response.taskID);
      pulse.emit('setSettings:end', { eventId, indexName, settings });
    } catch (err) {
      pulse.emit('error', {
        eventId,
        message: `Unable to set settings to ${indexName}`,
      });
    }
  },

  /**
   * Check if an index exists
   * @param {String} indexName Name of the index to check
   * @returns {Boolean} True if the index exists, false otherwise
   * Note: There is no API endpoint to check if an index exist, so we'll try to
   * get its settings to guess.
   **/
  async indexExists(indexName) {
    try {
      await this.initIndex(indexName).getSettings();
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Get the list of all records from an index
   * @param {String} indexName Name of the index
   * @param {Object} userOptions Options to pass to the browseAll call
   * @returns {Array} List of all records
   **/
  async getAllRecords(indexName, userOptions = {}) {
    const eventId = uuid();
    pulse.emit('getAllRecords:start', {
      eventId,
      indexName,
      currentPage: 1,
      maxPages: '?',
    });
    const options = {
      ...userOptions,
      hitsPerPage: 1000,
    };
    try {
      const index = this.initIndex(indexName);
      const browser = index.browseAll(options);
      const records = [];

      // Paginate through each page of browser and only resolve once we hit the
      // end
      return await new Promise((resolve, reject) => {
        browser.on('result', results => {
          const currentPage = results.page + 1;
          const maxPages = results.nbPages;
          pulse.emit('getAllRecords:page', {
            eventId,
            indexName,
            currentPage,
            maxPages,
          });
          records.push(results.hits);
        });
        browser.on('end', () => {
          pulse.emit('getAllRecords:end', { eventId, indexName });
          resolve(_.flatten(records));
        });
        browser.on('error', reject);
      });
    } catch (err) {
      // Index does not (yet) exists
      return [];
    }
  },

  /**
   * Run a set of batch operations and wait until they finish.
   * @param {Array} batches Array of batch operations
   * @param {Object} userOptions Options to handle the throughput
   * - .batchSize: How many batches operations max per call
   * - .concurrency: How many HTTP calls in parallel
   * @return {Void}
   * Note: This is not a blocking operation, the method still returns a Promise,
   * but it will wait for the Algolia API to have executed all the jobs before
   * resolving. It will also chunk large batches into smaller batches.
   **/
  async runBatchSync(batches, userOptions = {}) {
    if (_.isEmpty(batches)) {
      return;
    }
    const options = {
      batchSize: this.QUOTAS.batchMaxSize,
      concurrency: this.QUOTAS.batchMaxConcurrency,
      ...userOptions,
    };
    const chunks = _.chunk(batches, options.batchSize);

    const maxOperationCount = batches.length;
    const operationsCountPerBatch = options.batchSize;
    let currentOperationCount = 0;
    const eventId = uuid();
    pulse.emit('batch:start', {
      eventId,
      maxOperationCount,
      currentOperationCount,
    });
    await pMap(
      chunks,
      async (chunk, index) => {
        try {
          const response = await this.client.batch(chunk);

          // Now waiting for the batch to be executed on all the indexes
          const taskIDPerIndex = response.taskID;
          await pMap(_.keys(taskIDPerIndex), async indexName => {
            const taskID = taskIDPerIndex[indexName];
            await this.initIndex(indexName).waitTask(taskID);
          });
          currentOperationCount += chunk.length;
          pulse.emit('batch:chunk', {
            eventId,
            maxOperationCount,
            currentOperationCount,
          });
        } catch (err) {
          pulse.emit('error', {
            eventId,
            message: `Unable to send batch #${index}`,
          });
        }
      },
      { concurrency: options.concurrency }
    );
    pulse.emit('batch:end', { eventId });
  },
};

export default _.bindAll(module, _.functions(module));
