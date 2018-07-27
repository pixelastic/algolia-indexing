# algolia-indexing

This module will let you perform complex indexing operations with ease.

_⚠ This is still a heavy WIP and beta version_

It comes with three modes\*, each with their own pros and cons, for you to use
based on your needs.

_\* Only one mode is implemented today._

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

## `.verbose()`

By default, all methods are silent. By calling `indexing.verbose()`, you enable
the display of some progress indicators.

![Example of a Full Atomic](./.github/full-atomic.gif)

## Events

The module emits events at different points in time. You can listen to them and
react accordingly. Each event is fired with an object containing different
information relative to the event that fired it. 

All events have a specific key called `eventId` that is unique and shared across
events of the same origin. For example, a batch operation will emit
`batch:start` when starting, `batch:end` when finished and a certain number of
`batch:chunk` events depending on how large the batch is. All those events will
share the same `eventId`.

| event                                       | attributes                                   |
| --------------------------------------------|----------------------------------------------|
| `copyIndex:start`, `copyIndex:end`          | `source`, `destination`                      | 
| `moveIndex:start`, `moveIndex:end`          | `source`, `destination`                      | 
| `clearIndex:start`, `clearIndex:end`        | `indexName`                                  | 
| `setSettings:start`, `setSettings:end`      | `indexName`, `settings`                      |
| `getAllRecords:start`, `getAllRecords:page` | `indexName`, `currentPage`, `maxPages`       |
| `getAllRecords:end`                         | `indexName`                                  |
| `batch:start`, `batch:chunk`                | `currentOperationCount`, `maxOperationCount` |
| `batch:end`                                 |                                              |
| `error`                                     | `message`                                    |

## Config

`algolia-indexing` has sensible default configuration, but allows you to turn
knobs here and there.

The following table lists all the config keys and their default values. To
change a config value, you need to call `indexing.config({ keyToReplace:
'newValue' })`.

| Config                | Default Value | Description                                       |
|-----------------------|--------------:|---------------------------------------------------|
| `batchMaxSize`        | 1000          | Number of operations to send in one batch at most. |
| `batchMaxConcurrency` | 10            | Number of batches do we run in parallel            |
