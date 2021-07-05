const _ = require('golgoth/_');
const nodeObjectHash = require('node-object-hash');
const client = require('./client.js');
const firostError = require('firost/error');
const pulse = require('firost/pulse');

module.exports = {
  /**
   * Return a string hash of an record
   * @param {object} record Record to hash
   * @returns {string} hash of the record
   **/
  recordHash(record) {
    const cleanRecord = _.omit(record, 'objectID');
    return this.__hashMethod(cleanRecord);
  },

  /**
   * Add a unique objectID to all records
   * @param {Array} records Array of records to update
   * @returns {Array} Updated list of records
   **/
  addUniqueObjectIdToRecords(records) {
    return _.map(records, (record) => {
      record.objectID = this.recordHash(record);
      return record;
    });
  },

  /**
   * Returns a list of all objectIDs for a given index
   * @param {string} indexName Name of the index
   * @returns {Array} List of objectIds of the given index
   **/
  async getRemoteObjectIds(indexName) {
    const records = await client.getAllRecords(indexName, {
      attributesToRetrieve: 'objectID',
    });
    return _.chain(records).map('objectID').flatten().value();
  },

  /**
   * Returns a list of all objectIDs from a local list of records
   * @param {Array} records List of local records
   * @returns {Array} List of objectIDs from the passed list of records
   **/
  getLocalObjectIds(records) {
    return _.map(records, 'objectID');
  },

  /**
   * Returns a batch of operations to delete old records from the index and add
   * new ones.
   * @param {Array} remoteIds Array of objectIDs in the index
   * @param {Array} records Array of local records
   * @param {string} indexName Name of the index
   * @returns {Array} Array of operations to batch
   **/
  buildDiffBatch(remoteIds, records, indexName) {
    const localIds = this.getLocalObjectIds(records);

    const idsToDelete = _.difference(remoteIds, localIds);
    const idsToAdd = _.difference(localIds, remoteIds);
    const recordsById = _.keyBy(records, 'objectID');

    const deleteBatch = _.map(idsToDelete, (objectID) => {
      return {
        action: 'deleteObject',
        indexName,
        body: {
          objectID,
        },
      };
    });
    const addBatch = _.map(idsToAdd, (objectID) => {
      return {
        action: 'addObject',
        indexName,
        body: recordsById[objectID],
      };
    });

    return _.concat(deleteBatch, addBatch);
  },

  /**
   * Perform a full atomic indexing
   * @param {object} credentials Object with apiKey, appId and indexName keys
   * @param {Array} userRecords Record to index
   * @param {object} userSettings Setting to set to the index
   **/
  async run(credentials = {}, userRecords, userSettings = {}) {
    client.init(credentials.appId, credentials.apiKey);

    const indexName = credentials.indexName;
    const indexTmpName = `${indexName}_tmp`;

    const settings = _.omit(userSettings, 'replicas');

    try {
      // Create a tmp copy of the prod index so we can work on it
      await client.copyIndexSync(indexName, indexTmpName);

      // Update settings on the index first
      await client.setSettingsSync(indexTmpName, settings);

      // Add unique objectID to each local record
      const records = this.addUniqueObjectIdToRecords(userRecords);

      // What records are already in the app?
      const remoteIds = await this.getRemoteObjectIds(indexTmpName);

      // Apply the diff between local and remote on the tmp index
      const diffBatch = this.buildDiffBatch(remoteIds, records, indexTmpName);
      await client.runBatchSync(diffBatch);

      // Overwriting production index with temporary index
      await client.moveIndexSync(indexTmpName, indexName);

      // Configuring replicas
      await client.configureReplicasSync(indexName, userSettings);
    } catch (error) {
      pulse.emit('globalError', error.message);
      throw firostError(
        'ERROR_ALGOLIA_INDEXING',
        `[algolia-indexing]: ${error.message}`
      );
    }
  },

  __hashMethod: nodeObjectHash().hash,
};
