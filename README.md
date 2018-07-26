# algolia-indexing

This module will let you perform complex indexing operations with ease.

_⚠ This is still a heavy WIP and beta version_

It comes with three modes, each with their own pros and cons, for you to use
based on your needs.

## Full Atomic

```javascript
import indexing from 'algolia-indexing';

const credentials = { appId: 'XXX', apiKey: 'YYY' }
const records = [{foo: 'bar'}];
const settings = { searchableAttributes: ['foo'] };

indexing.fullAtomic(credentials, records, settings);
```

This mode will update an index with new records and settings in an **atomic**
way. It will be **fast** but will require a plan with a **large number of
records**.

How it works:

- Set a unique objectID to each record, based on its content
- Copy the production index to a temporary one
- Compare the new records and the existing records in the index
- Patch the temporary index, removing old records and adding new ones
- Overwrite production index with temporary one

To keep all processing fast, it uses a secondary index (called a manifest) to
store the list of objectIDs.

## Live Diff

This mode is similar to the full atomic, except that it will apply all
modifications directly on the production index, without using a temporary index.

It will still be fast and won't require a plan with a large number of records,
but the atomicity cannot be guaranteed for large number of changes.

How it works:

- Set a unique objectID to each record, based on its content
- Compare the new records and the existing records in the index
- Patch the temporary index, removing old records and adding new ones

_Note: This mode is not yet implemented._

## Basic Atomic

This mode will perform the most basic atomic update. It will be slow and will
require a plan with a large number of records and operations.

How it works:

- Push all records to a temporary index
- Overwrite the production index with the temporary one
