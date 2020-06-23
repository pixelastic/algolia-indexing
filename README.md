# Algolia-indexing

This module abstract complex indexing operations under one simple command. Its
goal is to use as few operations as possible when updating an index, by
performing diff comparisons instead of a full delete/overwrite.

Starting from v1.0, this package is no longer officially maintained by Algolia
but I, @pixelastic, took ownership.

## Installation

Install through `yarn` (or `npm`):

```shell
yarn add algolia-indexing
>>>>>>> docs(readme): Add documentation about replicas
```

## Usage

```javascript
const indexing = require('algolia-indexing');

const credentials = { appId: 'XXX', apiKey: 'YYY', indexName: 'my_index' };
const records = [{ foo: 'bar' }];
const settings = { searchableAttributes: ['foo'] };

await indexing.fullAtomic(credentials, records, settings);
```

This will update an index with new records and settings in an **atomic**
way. It will be **fast** but will require a plan with a **large number of
records** (as we'll need to duplicate the index for a short period of time).

How it works:

- Set a unique objectID to each record, based on its content
- Copy the production index to a temporary one
- Compare the new records and the existing records in the index
- Patch the temporary index by removing old records and adding new ones
- Overwrite production index with temporary one

To keep all processing fast, it uses a secondary index (called a manifest) to
store the list of objectIDs.

### `.verbose()`

By default, all methods are silent. By calling `indexing.verbose()`, you enable
the display of some progress indicators.

![Example of a Full Atomic][1]

## Events

The module emits events at different points in time. You can listen to them and
react accordingly. Each event is fired with an object containing different
information relative to the event that fired it.

All events have a specific key called `eventId` that is unique and shared across
events of the same origin. For example, a batch operation will emit
`batch:start` when starting, `batch:end` when finished and a certain number of
`batch:chunk` events depending on how large the batch is. All those events will
share the same `eventId`.

| event                                              | attributes                                   |
| -------------------------------------------------- | -------------------------------------------- |
| `copyIndex:start`, `copyIndex:end`                 | `source`, `destination`                      |
| `moveIndex:start`, `moveIndex:end`                 | `source`, `destination`                      |
| `clearIndex:start`, `clearIndex:end`               | `indexName`                                  |
| `setSettings:start`, `setSettings:end`             | `indexName`, `settings`                      |
| `configureReplicas:start`, `configureReplicas:end` | `indexName`                                  |
| `getAllRecords:start`, `getAllRecords:page`        | `indexName`, `currentPage`, `maxPages`       |
| `getAllRecords:end`                                | `indexName`                                  |
| `batch:start`, `batch:chunk`                       | `currentOperationCount`, `maxOperationCount` |
| `batch:end`                                        |                                              |
| `error`                                            | `message`                                    |

## Config

`algolia-indexing` has sensible default configuration, but allows you to turn
knobs here and there.

The following table lists all the config keys and their default values. To
change a config value, you need to call `indexing.config({ keyToReplace: 'newValue' })`.

| Config                | Default Value | Description                                        |
| --------------------- | ------------: | -------------------------------------------------- |
| `batchMaxSize`        |           100 | Number of operations to send in one batch at most. |
| `batchMaxConcurrency` |            10 | Number of batches do we run in parallel            |

## Replicas

The `settings.replicas` key can be used to define all the replicas and their
configuration. They, too, will be atomically updated on a new indexing.

```javascript
const credentials = {
  // …
  indexName: 'products',
};
const records = [
  // …
];
const settings = {
  // …
  searchableAttributes: ['title'],
  customRanking: ['desc(date)', 'desc(score)'],
  replicas: {
    popularity: {
      customRanking: ['desc(score)', 'desc(date)'],
    },
  },
};
const indexing.fullAtomic(credentials, records, settings);
```

The above config will order results by date, then score on the main index, but
will also create a `products_popularity` replica ordered by score, then date.

[1]: ./.github/full-atomic.gif
