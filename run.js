import indexing from './src/index.js';

(async function() {
  const credentials = {
    appId: process.env.ALGOLIA_APP_ID,
    apiKey: process.env.ALGOLIA_API_KEY,
    indexName: 'algolia_indexing',
  };
  const records = [{ foo: 'bar' }];
  const settings = {};

  indexing.verbose();

  await indexing.fullAtomic(credentials, records, settings);
})();
