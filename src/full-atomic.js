import _ from 'lodash';
import nodeObjectHash from 'node-object-hash';
import pAll from 'p-all';
import client from './client';

const module = {
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
   * Returns a list of all object ids stored in the manifest index
   * @param {String} indexName Name of the manifest index
   * @returns {Array} List of object ids stored in the manifest index
   **/
  async getRemoteObjectIds(indexName) {
    const records = await client.getAllRecords(indexName, {
      attributesToRetrieve: 'content',
    });
    return _.flatten(_.map(records, 'content'));
  },

  async run(inputRecords, settings, credentials) {
    const appId = _.get(credentials, 'appId');
    const apiKey = _.get(credentials, 'apiKey');
    client.init(appId, apiKey);

    const indexName = _.get(credentials, 'indexName');
    const indexTmpName = `${indexName}_tmp`;
    const indexManifestName = `${indexName}_manifest`;
    const indexManifestTmpName = `${indexName}_manifest_tmp`;

    try {
      // Add unique objectID to each local record
      const records = this.addUniqueObjectIdsToRecords(inputRecords);

      // What records are already in the app?
      const remoteIds = await getRemoteObjectIds(indexManifestName);

      // Add unique objectId to all records

      // Create a tmp copy of the prod index to add our changes
      await client.copyIndexSync(indexName, indexTmpName);

      // Update settings
      await client.setSettingsSync(indexTmpName, settings);

      // Apply the diff between local and remote on the temp index
      const diffBatch = buildDiffBatch(remoteIds, records, indexTmpName);
      await client.runBatchSync(diffBatch);

      // Preparing a new manifest index
      await client.clearIndexSync(indexManifestTmpName);
      const manifestBatch = buildManifestBatch(records, indexManifestTmpName);
      await client.runBatchSync(manifestBatch);

      // Overwriting production indexes with temporary indexes
      await pAll([
        async () => {
          await client.moveIndexSync(indexManifestTmpName, indexManifestName);
        },
        async () => {
          await client.moveIndexSync(indexTmpName, indexName);
        },
      ]);
    } catch (err) {
      console.info(err);
      console.info('Unable to update records');
    }
  },
};

export default _.bindAll(module, _.functions(module));

// const QUOTAS = {
//   manifestBrowseStep: 1000,
//   manifestIdsPerRecord: 100,
// };

// // Get all objectIds saved in the remote manifest
// async function getRemoteObjectIds(indexManifestName) {
//   try {
//     const index = client.initIndex(indexManifestName);
//     const browser = index.browseAll({
//       attributesToRetrieve: 'content',
//       hitsPerPage: QUOTAS.manifestBrowseStep,
//     });
//     let objectIDs = [];

//     // Return a promise, but only resolve it when we get to the end of the
//     // browse. At each step, we save the list of objectIDs saved in the
//     // manifest.
//     return await new Promise((resolve, reject) => {
//       browser.on('result', results => {
//         _.each(results.hits, hit => {
//           objectIDs = _.concat(objectIDs, hit.content);
//         });
//       });
//       browser.on('end', () => {
//         resolve(objectIDs);
//       });
//       browser.on('error', reject);
//     });
//   } catch (err) {
//     // Index does not (yet) exists
//     return [];
//   }
// }

// // Get all the local objectID from a record array
// function getLocalObjectIds(records) {
//   return _.map(records, 'objectID');
// }

// // Build the array of operations to send to create the diff between remoteIds
// // and local records
// function buildDiffBatch(remoteIds, records, indexName) {
//   const localIds = getLocalObjectIds(records);

//   const idsToDelete = _.difference(remoteIds, localIds);
//   const idsToAdd = _.difference(localIds, remoteIds);
//   const recordsById = _.keyBy(records, 'objectID');

//   const deleteBatch = _.map(idsToDelete, objectID => ({
//     action: 'deleteObject',
//     indexName,
//     body: {
//       objectID,
//     },
//   }));
//   const addBatch = _.map(idsToAdd, objectID => ({
//     action: 'addObject',
//     indexName,
//     body: recordsById[objectID],
//   }));
//   console.info(`${deleteBatch.length} objects to delete`);
//   console.info(`${addBatch.length} objects to add`);

//   return _.concat(deleteBatch, addBatch);
// }

// // Build the array of operations to add all objectIds to the manifest index
// function buildManifestBatch(records, indexName) {
//   const objectIds = getLocalObjectIds(records);
//   const chunks = _.chunk(objectIds, QUOTAS.manifestIdsPerRecord);

//   return _.map(chunks, chunk => ({
//     action: 'addObject',
//     indexName,
//     body: {
//       content: chunk,
//     },
//   }));
// }

// const fullAtomic = async function(inputRecords, settings, credentials) {
//   const appId = _.get(credentials, 'appId');
//   const apiKey = _.get(credentials, 'apiKey');
//   client.init(appId, apiKey);

//   const indexName = _.get(credentials, 'indexName');
//   const indexTmpName = `${indexName}_tmp`;
//   const indexManifestName = `${indexName}_manifest`;
//   const indexManifestTmpName = `${indexName}_manifest_tmp`;

//   try {
//     // Add unique objectID to each local record
//     const records = addUniqueObjectIdsToRecords(inputRecords);

//     // What records are already in the app?
//     const remoteIds = await getRemoteObjectIds(indexManifestName);

//     // Add unique objectId to all records

//     // Create a tmp copy of the prod index to add our changes
//     await client.copyIndexSync(indexName, indexTmpName);

//     // Update settings
//     await client.setSettingsSync(indexTmpName, settings);

//     // Apply the diff between local and remote on the temp index
//     const diffBatch = buildDiffBatch(remoteIds, records, indexTmpName);
//     await client.runBatchSync(diffBatch);

//     // Preparing a new manifest index
//     await client.clearIndexSync(indexManifestTmpName);
//     const manifestBatch = buildManifestBatch(records, indexManifestTmpName);
//     await client.runBatchSync(manifestBatch);

//     // Overwriting production indexes with temporary indexes
//     await pAll([
//       async () => {
//         await client.moveIndexSync(indexManifestTmpName, indexManifestName);
//       },
//       async () => {
//         await client.moveIndexSync(indexTmpName, indexName);
//       },
//     ]);
//   } catch (err) {
//     console.info(err);
//     console.info('Unable to update records');
//   }
// };

// export default fullAtomic;
