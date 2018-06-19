import algoliasearch from 'algoliasearch';
import _ from 'lodash';
import chalk from 'chalk';
import pMap from 'p-map';
import pulse from './pulse';
const QUOTAS = {
  batchMaxSize: 1000,
  batchMaxConcurrency: 10,
};
let client;
let indexes;

function init(appId, apiKey) {
  client = algoliasearch(appId, apiKey);
  indexes = {};
}

/**
 * Clear an index and wait until it is cleaned
 * @param {String} indexName Name of the index to clean
 * @returns {Void}
 **/
async function clearIndexSync(indexName) {
  pulse.emit('clearIndex:start', indexName);
  try {
    const index = initIndex(indexName);
    const response = await index.clearIndex();
    await index.waitTask(response.taskID);
    pulse.emit('clearIndex:end', indexName);
  } catch (err) {
    pulse.emit('error', `Unable to clear index ${indexName}`);
  }
}

/**
 * Create a copy of an existing index
 * @param {String} source Name of the source index
 * @param {String} destination Name of the destination index
 * @returns {Promise} Wait for the new index to be created
 **/
async function copyIndexSync(source, destination) {
  pulse.emit('copyIndex:start', { source, destination });
  // If the source index does not exist, we simply create it. We can't copy an
  // empty index because we won't be able to wait for the task to finish.
  if (!await indexExists(source)) {
    await initIndex(source).setSettings({});
    pulse.emit('copyIndex:end', { source, destination });
    return;
  }
  try {
    const response = await client.copyIndex(source, destination);
    await initIndex(source).waitTask(response.taskID);
    pulse.emit('copyIndex:end', { source, destination });
  } catch (err) {
    pulse.emit('error', `Unable to copy index ${source} to ${destination}`);
  }
}

/**
 * Check if an index exists
 * @param {String} indexName Name of the index to check
 * @returns {Boolean} True if the index exists, false otherwise
 * Note: There is no API endpoint to check if an index exist, so we'll try to
 * get its settings to guess.
 **/
async function indexExists(indexName) {
  try {
    await initIndex(indexName).getSettings();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Return an index object from an indexName
 * @param {String} indexName Name of the index
 * @returns {Object} Algolia index object
 * Note: This is a wrapper around client.initIndex, but using a local cache
 **/
function initIndex(indexName) {
  const cacheHit = indexes[indexName];
  if (cacheHit) {
    return cacheHit;
  }

  const newIndex = client.initIndex(indexName);
  indexes[indexName] = newIndex;
  return newIndex;
}

// Run an array of batch operations and resolve when they are all applied.
// Note that the "Sync" does not mean you can write synchronous blocking code
// but that it will wait for the Algolia API to apply them. Also note that it
// might split the actual batch into smaller batches
async function runBatchSync(batches, userOptions = {}) {
  const options = {
    batchSize: QUOTAS.batchMaxSize,
    concurrency: QUOTAS.batchMaxConcurrency,
    ...userOptions,
  };
  const chunks = _.chunk(batches, options.batchSize);
  console.info(
    `Pushing ${batches.length} operations in batches of ${options.batchSize}`
  );

  await pMap(
    chunks,
    async (chunk, index) => {
      try {
        const response = await client.batch(chunk);

        // Now waiting for the batch to be executed on all the indexes
        const taskIDPerIndex = response.taskID;
        await pMap(_.keys(taskIDPerIndex), async indexName => {
          const taskID = taskIDPerIndex[indexName];
          await initIndex(indexName).waitTask(taskID);
        });
      } catch (err) {
        errorHandler(err, `Unable to send batch #${index}`);
      }
    },
    { concurrency: options.concurrency }
  );
}

// Copy settings from one index to a new one
async function setSettingsSync(indexName, settings) {
  console.info(`Update settings on ${indexName}`);
  try {
    const index = initIndex(indexName);
    const response = await index.setSettings(settings);
    await index.waitTask(response.taskID);
  } catch (err) {
    errorHandler(err, `Unable to set settings to ${indexName}`);
  }
}

// Display errors
function errorHandler(err, customMessage) {
  // console.error(err);
  if (customMessage) {
    console.error(chalk.bold.red(customMessage));
  }
  if (err.message) {
    console.error(chalk.red(err.message));
  }
  throw new Error(customMessage || err.message || err);
}

/**
 * Create a client instance. This client is an alternative version of the
 * regular algoliasearch helper that includes several methods to help in doing
 * atomic indexing.
 * Most of the methods available are prefix with `Sync` meaning that they will
 * wait for the Algolia API to actually process the job before resolving. It
 * does not mean they will perform a blocking operation, though; they will still
 * be asynchronous, but only resolve when the Algolia API will have processed
 * them.
 * @param {String} appId The Algolia Application Id
 * @param {String} apiKey The Algolia Admin API key
 * @returns {Object} An alternative Algolia client for performing indexing
 * operations
 **/
export default {
  init,
  clearIndexSync,
  copyIndexSync,
  indexExists,
  initIndex,
  runBatchSync,
  setSettingsSync,
  internals: {
    errorHandler,
  },
};