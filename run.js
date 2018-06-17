import algoliaIndexing from './src/index.js';

const credentials = { appId: 'XXX', apiKey: 'YYY' };
const indexing = algoliaIndexing(credentials);

indexing.fullAtomic();
console.info(indexing.fullAtomic.internals);


// const records = [{ foo: 'bar' }];
// const settings = { bar: 'baz'}
// indexing.fullAtomic(records, settings, 'my_index');
