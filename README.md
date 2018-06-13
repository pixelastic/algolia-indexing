# algolia-indexing

```javascript
import indexing from 'algolia-indexing';

const records = [{foo: 'bar'}];
const settings = { searchableAttributes: ['foo'] };
const credentials = { appId: 'XXX', apiKey: 'YYY' }

const client = indexing.init(credentials);

// This will push all records to a temporary index, apply the settings on it,
// and once everything is correctly updated, will overwrite the production index
// with the temporary one.
// This is the one true real atomic move, but it will consume a lot of operations
// and records and is also quite slow.
client.fullAtomic(records, settings, 'my_index');


// This will create a copy of the existing index and apply the settings on it. It
// will then make a diff update between the current copied index and the local
// records and only add new records and delete old ones.
// This will work by creating a unique objectID for each record, based on a hash of
// its content. It will also create a _manifest index that contains the list of all
// objectID for faster diffing. Once everything is updated, it will replace the
// production index.
// This will consume much less operations, but still consume a lot of records. It
// will also create a secondary index, and is overall a much complex process.
client.diffAtomic(records, settings, 'my_index');


// This will make a diff between the current production records and the local ones,
// only adding new ones and deleting old ones from the index. All updates are done
// on the production index. We will try to batch them as much as we can, but there
// is no guarantee that it's going to be atomic.
// This will consume very few records and operations, but there is no guarantee of
// being atomic.
client.diffLive(records, settings, 'my_index')
```
