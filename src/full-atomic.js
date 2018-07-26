import _ from 'lodash';
import nodeObjectHash from 'node-object-hash';
import client from './client';

const module = {
  manifestIdsPerRecord() {
    return 100;
  },

  /**
   * Add a unique objectID to all records
   * @param {Array} inputRecords Array of records to update
   * @returns {Array} Updated list of records
   **/
  addUniqueObjectIdsToRecords(inputRecords) {
    const hashObject = nodeObjectHash().hash;
    const records = _.map(inputRecords, record => {
      const newRecord = _.omit(record, 'objectID');
      newRecord.objectID = hashObject(newRecord);
      return newRecord;
    });

    return records;
  },

  /**
   * Returns a list of all objectIDs stored in the manifest index
   * @param {String} indexName Name of the manifest index
   * @returns {Array} List of objectIds stored in the manifest index
   **/
  async getRemoteObjectIds(indexName) {
    const records = await client.getAllRecords(indexName, {
      attributesToRetrieve: 'content',
    });
    return _.flatten(_.map(records, 'content'));
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
   * @param {String} indexName Name of the index
   * @returns {Array} Array of operations to batch
   **/
  buildDiffBatch(remoteIds, records, indexName) {
    const localIds = this.getLocalObjectIds(records);

    const idsToDelete = _.difference(remoteIds, localIds);
    const idsToAdd = _.difference(localIds, remoteIds);
    const recordsById = _.keyBy(records, 'objectID');

    const deleteBatch = _.map(idsToDelete, objectID => ({
      action: 'deleteObject',
      indexName,
      body: {
        objectID,
      },
    }));
    const addBatch = _.map(idsToAdd, objectID => ({
      action: 'addObject',
      indexName,
      body: recordsById[objectID],
    }));

    return _.concat(deleteBatch, addBatch);
  },

  // Build the array of operations to add all objectIds to the manifest index
  buildManifestBatch(records, indexName) {
    const objectIds = this.getLocalObjectIds(records);
    const chunks = _.chunk(objectIds, this.manifestIdsPerRecord());

    return _.map(chunks, chunk => ({
      action: 'addObject',
      indexName,
      body: {
        content: chunk,
      },
    }));
  },

  async run(credentials, inputRecords, settings) {
    const appId = _.get(credentials, 'appId');
    const apiKey = _.get(credentials, 'apiKey');
    client.init(appId, apiKey);

    const indexName = _.get(credentials, 'indexName');
    const indexTmpName = `${indexName}_tmp`;
    const indexManifestName = `${indexName}_manifest`;
    const indexManifestTmpName = `${indexName}_manifest_tmp`;

    try {
      // Create a tmp copy of the prod index to add our changes
      await client.copyIndexSync(indexName, indexTmpName);

      // Update settings
      await client.setSettingsSync(indexTmpName, settings);

      // Add unique objectID to each local record
      const records = this.addUniqueObjectIdsToRecords(inputRecords);

      // What records are already in the app?
      const remoteIds = await this.getRemoteObjectIds(indexManifestName);

      // Apply the diff between local and remote on the temp index
      const diffBatch = this.buildDiffBatch(remoteIds, records, indexTmpName);
      await client.runBatchSync(diffBatch);

      // Preparing a new manifest index
      await client.clearIndexSync(indexManifestTmpName);
      const manifestBatch = this.buildManifestBatch(
        records,
        indexManifestTmpName
      );
      await client.runBatchSync(manifestBatch);

      // Overwriting production indexes with temporary indexes
      await client.moveIndexSync(indexManifestTmpName, indexManifestName);
      await client.moveIndexSync(indexTmpName, indexName);
    } catch (err) {
      console.info(err);
      console.info('Unable to update records');
    }
  },
};

export default _.bindAll(module, _.functions(module));
