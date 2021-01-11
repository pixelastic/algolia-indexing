const algoliasearch = require('algoliasearch');
const _ = require('golgoth/_');
const uuid = require('firost/lib/uuid');
const pMap = require('golgoth/pMap');
const pulse = require('firost/lib/pulse');
const config = require('./config.js');

module.exports = {
  client: null,

  /**
   * Init the module with the Algolia credentials
   * @param {string} appId The application id
   * @param {string} apiKey The API key
   **/
  init(appId, apiKey) {
    this.client = this.__algoliasearch(appId, apiKey);
  },

  /**
   * Return an index object from an indexName
   * @param {string} indexName Name of the index
   * @returns {object} Algolia index object
   **/
  index(indexName) {
    return this.client.initIndex(indexName);
  },

  /**
   * Clear an index and wait until it is cleared
   * @param {string} indexName Name of the index to clean
   **/
  async clearIndexSync(indexName) {
    const eventId = this.__uuid();
    pulse.emit('clearIndex.start', { eventId, indexName });

    try {
      const index = this.index(indexName);
      index.clearObjects().wait();
      pulse.emit('clearIndex.end', { eventId, indexName });
    } catch (err) {
      pulse.emit('error', {
        eventId,
        message: `Unable to clear index ${indexName}`,
      });
    }
  },
  /**
   * Create an empty index
   * @param {string} indexName Name of the source index
   * @returns {Promise} Wait for the new index to be created
   */
  async createIndexSync(indexName) {
    const index = this.index(indexName);
    await index.setSettings({}).wait();
  },
  /**
   * Create a copy of an existing index
   * @param {string} source Name of the source index
   * @param {string} destination Name of the destination index
   * @returns {Promise} Wait for the new index to be created
   **/
  async copyIndexSync(source, destination) {
    const eventId = this.__uuid();
    pulse.emit('copyIndex.start', { eventId, source, destination });

    // Create source first if does not exists, otherwise the operation will
    // never succeed
    const sourceIndex = this.index(source);
    if (!(await sourceIndex.exists())) {
      await this.createIndexSync(source);
    }

    try {
      await this.client.copyIndex(source, destination).wait();
      pulse.emit('copyIndex.end', { eventId, source, destination });
    } catch (err) {
      pulse.emit('error', {
        eventId,
        message: `Unable to copy index ${source} to ${destination}`,
      });
    }
  },

  /**
   * Rename an existing index
   * @param {string} source Name of the source index
   * @param {string} destination Name of the destination index
   * @returns {Promise} Wait for the index to be renamed
   **/
  async moveIndexSync(source, destination) {
    const eventId = this.__uuid();
    pulse.emit('moveIndex.start', { eventId, source, destination });

    // Create source first if does not exists, otherwise the operation will
    // never succeed
    const sourceIndex = this.index(source);
    if (!(await sourceIndex.exists())) {
      await this.createIndexSync(source);
    }

    try {
      await this.client.moveIndex(source, destination).wait();
      pulse.emit('moveIndex.end', { eventId, source, destination });
    } catch (err) {
      pulse.emit('error', {
        eventId,
        message: `Unable to move index ${source} to ${destination}`,
      });
    }
  },

  /**
   * Set settings to an index
   * @param {string} indexName Name of the index
   * @param {object} settings Settings of the index
   **/
  async setSettingsSync(indexName, settings) {
    const eventId = this.__uuid();
    pulse.emit('setSettings.start', { eventId, indexName, settings });

    try {
      const index = this.index(indexName);
      await index.setSettings(settings).wait();
      pulse.emit('setSettings.end', { eventId, indexName, settings });
    } catch (err) {
      pulse.emit('error', {
        eventId,
        message: `Unable to set settings to ${indexName}`,
      });
    }
  },

  /**
   * Configure replicas with custom settings
   * @param {string} indexName Name of the primary index
   * @param {object} userSettings Settings of the main index, including
   * a replica (potentially custom syntax) key
   */
  async configureReplicasSync(indexName, userSettings) {
    const replicas = _.get(userSettings, 'replicas');
    const isDefaultReplicaSyntax = _.isArray(replicas);

    // Normal replicas, we simply update the settings to use the existing
    // indices
    if (isDefaultReplicaSyntax) {
      const index = this.index(indexName);
      await index.setSettings({ replicas }).wait();
      return;
    }

    const eventId = this.__uuid();
    pulse.emit('configureReplicas.start', { eventId, indexName });

    // Convert custom replica syntax to array
    const replicaList = _.map(replicas, (specificSettings, replicaSuffix) => {
      return {
        replicaName: `${indexName}_${replicaSuffix}`,
        specificSettings,
      };
    });
    const replicaNames = _.map(replicaList, 'replicaName');

    // Update the replicas of the main index
    const index = this.index(indexName);
    await index.setSettings({ replicas: replicaNames }).wait();

    // Update each replica settings with base settings merged with specific
    const settings = _.omit(userSettings, 'replicas');
    await pMap(replicaList, async ({ replicaName, specificSettings }) => {
      const replicaSettings = {
        ...settings,
        ...specificSettings,
      };
      const replica = this.index(replicaName);
      await replica.setSettings(replicaSettings).wait();
    });
    pulse.emit('configureReplicas.end', { eventId, indexName });
  },

  /**
   * Get the list of all records from an index
   * @param {string} indexName Name of the index
   * @param {object} userOptions Options to pass to the browseAll call
   * @returns {Array} List of all records
   **/
  async getAllRecords(indexName, userOptions = {}) {
    const eventId = this.__uuid();
    pulse.emit('getAllRecords.start', {
      eventId,
      indexName,
    });
    const options = {
      ...userOptions,
      hitsPerPage: 1000,
    };
    try {
      const index = this.index(indexName);
      if (!(await index.exists())) {
        pulse.emit('getAllRecords.end', { eventId, indexName });
        return [];
      }
      let records = [];
      await index.browseObjects({
        ...options,
        batch(hits) {
          records = records.concat(hits);
        },
      });
      pulse.emit('getAllRecords.end', { eventId, indexName });
      return records;
    } catch (err) {
      pulse.emit('error', {
        eventId,
        message: `Unable to get all records from ${indexName}`,
      });
    }
  },

  /**
   * Run a set of batch operations and wait until they finish.
   * @param {Array} batches Array of batch operations
   * @param {object} userOptions Options to handle the throughput
   * - .batchSize: How many batches operations max per call
   * - .concurrency: How many HTTP calls in parallel
   * Note: This is not a blocking operation, the method still returns a Promise,
   * but it will wait for the Algolia API to have executed all the jobs before
   * resolving. It will also chunk large batches into smaller batches.
   **/
  async runBatchSync(batches, userOptions = {}) {
    if (_.isEmpty(batches)) {
      return;
    }
    const options = {
      batchSize: config.read('batchMaxSize'),
      concurrency: config.read('batchMaxConcurrency'),
      ...userOptions,
    };
    const chunks = _.chunk(batches, options.batchSize);

    const maxOperationCount = batches.length;
    let currentOperationCount = 0;
    const eventId = this.__uuid();
    pulse.emit('batch.start', {
      eventId,
      maxOperationCount,
      currentOperationCount,
    });
    await this.__pMap(
      chunks,
      async (chunk) => {
        try {
          await this.client.multipleBatch(chunk).wait();

          currentOperationCount += chunk.length;
          pulse.emit('batch.chunk', {
            eventId,
            maxOperationCount,
            currentOperationCount,
          });
        } catch (err) {
          const message = `Unable to process batch\n${err.name}\n${err.message}`;
          pulse.emit('error', {
            eventId,
            message,
          });
        }
      },
      { concurrency: options.concurrency }
    );
    pulse.emit('batch.end', { eventId });
  },
  __algoliasearch: algoliasearch,
  __uuid: uuid,
  __pMap: pMap,
};
