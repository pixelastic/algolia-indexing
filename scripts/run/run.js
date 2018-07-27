import indexing from '../../src/index.js';
import fs from 'fs';

(async function() {
  const credentials = {
    appId: process.env.ALGOLIA_APP_ID,
    apiKey: process.env.ALGOLIA_API_KEY,
    indexName: 'records',
  };
  const records = JSON.parse(
    fs.readFileSync('./scripts/run/actors.json').toString('utf-8')
  );
  const settings = JSON.parse(
    fs.readFileSync('./scripts/run/settings.json').toString('utf-8')
  );

  indexing.verbose();
  indexing.config({
    batchMaxSize: 100,
  });
  await indexing.fullAtomic(credentials, records, settings);
})();
