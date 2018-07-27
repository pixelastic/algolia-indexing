import module from '../client';
import helper from '../test-helper';
const mock = helper.mock(module);
jest.mock('../pulse');
import pulse from '../pulse';
jest.mock('algoliasearch');
import algoliasearch from 'algoliasearch';
jest.mock('uuid/v1');
import uuid from 'uuid/v1';
import EventEmitter from 'events';
const anyString = expect.any(String);
const objectLike = expect.objectContaining;

describe('client', () => {
  const mockIndex = {
    waitTask: jest.fn(),
    clearIndex: jest.fn(),
    setSettings: jest.fn(),
    getSettings: jest.fn(),
    browseAll: jest.fn(),
  };
  const mockClient = {
    copyIndex: jest.fn(),
    moveIndex: jest.fn(),
    initIndex: jest.fn(),
    batch: jest.fn(),
  };
  beforeEach(() => {
    algoliasearch.mockReturnValue(mockClient);
    module.init();
  });

  describe('init', () => {
    it('should init a new algoliaclient', () => {
      module.client = 'dirty client';
      algoliasearch.mockReturnValue('new client');

      module.init();

      expect(module.client).toEqual('new client');
    });
    it('should revert the index cache', () => {
      module.indexes = 'dirty cache';

      module.init();

      expect(module.indexes).toEqual({});
    });
  });

  describe('initIndex', () => {
    it('should return the index object from the client', () => {
      mockClient.initIndex.mockReturnValue(mockIndex);

      const actual = module.initIndex('foo');

      expect(actual).toEqual(mockIndex);
    });

    it('should read the value from cache if asked several times', () => {
      mockClient.initIndex.mockReturnValue(mockIndex);

      module.initIndex('foo');
      module.initIndex('foo');

      expect(mockClient.initIndex).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearIndexSync', () => {
    it('should wait for the waitTask to complete', async () => {
      mock('initIndex', mockIndex);
      mockIndex.clearIndex.mockReturnValue({ taskID: 1234 });

      await module.clearIndexSync('indexName');

      expect(mockIndex.waitTask).toHaveBeenCalledWith(1234);
    });

    it('should emit a start and end event', async () => {
      mock('initIndex', mockIndex);
      mockIndex.clearIndex.mockReturnValue({ taskID: 1234 });
      uuid.mockReturnValue('baz');

      await module.clearIndexSync('indexName');

      expect(pulse.emit).toHaveBeenCalledWith(
        'clearIndex:start',
        objectLike({ eventId: 'baz', indexName: 'indexName' })
      );
      expect(pulse.emit).toHaveBeenCalledWith(
        'clearIndex:end',
        objectLike({ eventId: 'baz', indexName: 'indexName' })
      );
    });

    describe('on error', () => {
      it('should emit an error if not possible', async () => {
        mock('initIndex', mockIndex);
        mockIndex.clearIndex.mockImplementation(() => {
          throw new Error();
        });
        uuid.mockReturnValue('baz');

        await module.clearIndexSync('indexName');

        expect(pulse.emit).toHaveBeenCalledWith(
          'error',
          objectLike({
            eventId: 'baz',
            message: anyString,
          })
        );
      });
    });
  });

  describe('copyIndexSync', () => {
    describe('source does not exist', () => {
      it('should create an empty index', async () => {
        mock('indexExists', false);
        mock('initIndex', mockIndex);

        await module.copyIndexSync('foo', 'bar');

        expect(mockIndex.setSettings).toHaveBeenCalledWith({});
        expect(pulse.emit).toHaveBeenCalledWith(
          'copyIndex:end',
          objectLike({
            source: 'foo',
            destination: 'bar',
          })
        );
      });
    });

    describe('source exists', () => {
      beforeEach(() => {
        mock('indexExists').mockReturnValue(true);
      });

      it('should wait for the waitTask to complete', async () => {
        mockClient.copyIndex.mockReturnValue({ taskID: 1234 });
        mock('initIndex', mockIndex);

        await module.copyIndexSync('foo', 'bar');

        expect(mockIndex.waitTask).toHaveBeenCalledWith(1234);
      });

      it('should emit a start and end event', async () => {
        mockClient.copyIndex.mockReturnValue({ taskID: 1234 });
        mock('initIndex', mockIndex);
        uuid.mockReturnValue('baz');

        await module.copyIndexSync('foo', 'bar');

        expect(pulse.emit).toHaveBeenCalledWith(
          'copyIndex:start',
          objectLike({
            eventId: 'baz',
            source: 'foo',
            destination: 'bar',
          })
        );
        expect(pulse.emit).toHaveBeenCalledWith(
          'copyIndex:end',
          objectLike({
            eventId: 'baz',
            source: 'foo',
            destination: 'bar',
          })
        );
      });

      it('should emit an error', async () => {
        mockClient.copyIndex.mockImplementation(() => {
          throw new Error();
        });
        uuid.mockReturnValue('baz');

        await module.copyIndexSync('foo', 'bar');

        expect(pulse.emit).toHaveBeenCalledWith(
          'error',
          objectLike({
            eventId: 'baz',
            message: anyString,
          })
        );
      });
    });
  });

  describe('moveIndexSync', () => {
    describe('source does not exist', () => {
      it('should create an empty index', async () => {
        mock('indexExists', false);
        mock('initIndex', mockIndex);

        await module.moveIndexSync('foo', 'bar');

        expect(mockIndex.setSettings).toHaveBeenCalledWith({});
        expect(pulse.emit).toHaveBeenCalledWith(
          'moveIndex:end',
          objectLike({
            source: 'foo',
            destination: 'bar',
          })
        );
      });
    });

    describe('source exists', () => {
      beforeEach(() => {
        mock('indexExists').mockReturnValue(true);
      });

      it('should wait for the waitTask to complete', async () => {
        mockClient.moveIndex.mockReturnValue({ taskID: 1234 });
        mock('initIndex', mockIndex);

        await module.moveIndexSync('foo', 'bar');

        expect(mockIndex.waitTask).toHaveBeenCalledWith(1234);
      });

      it('should emit a start and end event', async () => {
        mockClient.moveIndex.mockReturnValue({ taskID: 1234 });
        mock('initIndex', mockIndex);
        uuid.mockReturnValue('baz');

        await module.moveIndexSync('foo', 'bar');

        expect(pulse.emit).toHaveBeenCalledWith(
          'moveIndex:start',
          objectLike({
            eventId: 'baz',
            source: 'foo',
            destination: 'bar',
          })
        );
        expect(pulse.emit).toHaveBeenCalledWith(
          'moveIndex:end',
          objectLike({
            eventId: 'baz',
            source: 'foo',
            destination: 'bar',
          })
        );
      });

      it('should emit an error', async () => {
        mockClient.moveIndex.mockImplementation(() => {
          throw new Error();
        });
        uuid.mockReturnValue('baz');

        await module.moveIndexSync('foo', 'bar');

        expect(pulse.emit).toHaveBeenCalledWith(
          'error',
          objectLike({
            eventId: 'baz',
            message: anyString,
          })
        );
      });
    });
  });

  describe('setSettingsSync', () => {
    it('should wait for the waitTask to complete', async () => {
      mock('initIndex', mockIndex);
      mockIndex.setSettings.mockReturnValue({ taskID: 1234 });

      await module.setSettingsSync('indexName');

      expect(mockIndex.waitTask).toHaveBeenCalledWith(1234);
    });

    it('should emit a start and end event', async () => {
      mock('initIndex', mockIndex);
      mockIndex.setSettings.mockReturnValue({});
      uuid.mockReturnValue('baz');

      await module.setSettingsSync('indexName', { foo: 'bar' });

      expect(pulse.emit).toHaveBeenCalledWith(
        'setSettings:start',
        objectLike({
          eventId: 'baz',
          indexName: 'indexName',
          settings: { foo: 'bar' },
        })
      );
      expect(pulse.emit).toHaveBeenCalledWith(
        'setSettings:end',
        objectLike({
          eventId: 'baz',
          indexName: 'indexName',
          settings: { foo: 'bar' },
        })
      );
    });

    describe('on error', () => {
      it('should emit an error if not possible', async () => {
        mock('initIndex', mockIndex);
        mockIndex.setSettings.mockImplementation(() => {
          throw new Error();
        });
        uuid.mockReturnValue('baz');

        await module.setSettingsSync('indexName');

        expect(pulse.emit).toHaveBeenCalledWith(
          'error',
          objectLike({
            eventId: 'baz',
            message: anyString,
          })
        );
      });
    });
  });

  describe('indexExists', () => {
    beforeEach(() => {
      mock('initIndex').mockReturnValue(mockIndex);
    });

    it('should return true if can get settings', async () => {
      const actual = await module.indexExists('foo');

      expect(actual).toEqual(true);
    });

    it('should return false if cannot get settings', async () => {
      mockIndex.getSettings.mockImplementation(() => {
        throw new Error();
      });

      const actual = await module.indexExists('foo');

      expect(actual).toEqual(false);
    });
  });

  describe('runBatchSync', () => {
    it('splits the batch in smaller chunks', async () => {
      const batches = ['foo', 'bar', 'baz'];
      const userOptions = { batchSize: 1 };
      mockClient.batch.mockReturnValue({ taskID: {} });

      await module.runBatchSync(batches, userOptions);

      expect(mockClient.batch).toHaveBeenCalledWith(['foo']);
      expect(mockClient.batch).toHaveBeenCalledWith(['bar']);
      expect(mockClient.batch).toHaveBeenCalledWith(['baz']);
    });

    it('waits for tasks on all indexes', async () => {
      const batches = ['foo', 'bar', 'baz'];
      const userOptions = { batchSize: 1 };
      mockClient.batch.mockReturnValue({
        taskID: {
          indexfoo: 1234,
          indexbar: 5678,
        },
      });
      const mockInitIndex = mock('initIndex', mockIndex);

      await module.runBatchSync(batches, userOptions);

      expect(mockInitIndex).toHaveBeenCalledWith('indexfoo');
      expect(mockInitIndex).toHaveBeenCalledWith('indexbar');
      expect(mockIndex.waitTask).toHaveBeenCalledWith(1234);
      expect(mockIndex.waitTask).toHaveBeenCalledWith(5678);
    });

    it('does nothing if no operations to batch', async () => {
      const batches = [];
      const userOptions = {};

      await module.runBatchSync(batches, userOptions);

      expect(pulse.emit).not.toHaveBeenCalled();
    });

    it('emits an error if cannot batch', async () => {
      const batches = ['foo', 'bar', 'baz'];
      const userOptions = { batchSize: 1 };
      mockClient.batch.mockImplementation(() => {
        throw new Error();
      });
      uuid.mockReturnValue('baz');

      await module.runBatchSync(batches, userOptions);

      expect(pulse.emit).toHaveBeenCalledWith(
        'error',
        objectLike({
          eventId: 'baz',
          message: anyString,
        })
      );
    });

    it('emits a start and end event', async () => {
      const batches = ['foo', 'bar', 'baz'];
      const userOptions = { batchSize: 1 };
      mockClient.batch.mockReturnValue({ taskID: {} });
      uuid.mockReturnValue('baz');

      await module.runBatchSync(batches, userOptions);

      expect(pulse.emit).toHaveBeenCalledWith(
        'batch:start',
        objectLike({
          eventId: 'baz',
          maxOperationCount: 3,
          currentOperationCount: 0,
        })
      );
      expect(pulse.emit).toHaveBeenCalledWith(
        'batch:end',
        objectLike({ eventId: 'baz' })
      );
    });

    it('emits chunk events', async () => {
      const batches = ['foo', 'bar', 'baz'];
      const userOptions = { batchSize: 2 };
      mockClient.batch.mockReturnValue({ taskID: {} });
      uuid.mockReturnValue('baz');

      await module.runBatchSync(batches, userOptions);

      expect(pulse.emit).toHaveBeenCalledWith(
        'batch:chunk',
        objectLike({
          eventId: 'baz',
          maxOperationCount: 3,
          currentOperationCount: 2,
        })
      );
      expect(pulse.emit).toHaveBeenCalledWith(
        'batch:chunk',
        objectLike({
          eventId: 'baz',
          maxOperationCount: 3,
          currentOperationCount: 3,
        })
      );
    });
  });

  describe('getAllRecords', () => {
    let browser;
    beforeEach(() => {
      mock('initIndex', mockIndex);
      browser = new EventEmitter();
      mockIndex.browseAll.mockReturnValue(browser);
    });

    it('should return all the browsed records', () => {
      expect.assertions(1);

      const actual = module.getAllRecords().then(results => {
        expect(results).toEqual(['foo', 'bar']);
      });

      // Paginate twice, then stop
      browser.emit('result', { hits: ['foo'] });
      browser.emit('result', { hits: ['bar'] });
      browser.emit('end');

      return actual;
    });

    it('should paginate with 1000 hitsPerPage', () => {
      expect.assertions(1);

      const expected = expect.objectContaining({
        hitsPerPage: 1000,
      });
      const actual = module.getAllRecords().then(() => {
        expect(mockIndex.browseAll).toHaveBeenCalledWith(expected);
      });

      // Paginate twice, then stop
      browser.emit('end');

      return actual;
    });

    it('should paginate with custom options', () => {
      expect.assertions(1);

      const expected = expect.objectContaining({
        foo: 'bar',
      });
      const actual = module
        .getAllRecords('my_index', { foo: 'bar' })
        .then(() => {
          expect(mockIndex.browseAll).toHaveBeenCalledWith(expected);
        });

      // Paginate twice, then stop
      browser.emit('end');

      return actual;
    });

    it('should emit start/stop events', () => {
      expect.assertions(2);
      uuid.mockReturnValue('baz');

      const actual = module.getAllRecords('my_index').then(() => {
        expect(pulse.emit).toHaveBeenCalledWith(
          'getAllRecords:start',
          objectLike({
            eventId: 'baz',
            indexName: 'my_index',
            currentPage: 1,
            maxPages: '?',
          })
        );
        expect(pulse.emit).toHaveBeenCalledWith(
          'getAllRecords:end',
          objectLike({
            eventId: 'baz',
            indexName: 'my_index',
          })
        );
      });

      browser.emit('end');

      return actual;
    });

    it('should emit page events', () => {
      expect.assertions(2);
      uuid.mockReturnValue('baz');

      const actual = module.getAllRecords('my_index').then(() => {
        expect(pulse.emit).toHaveBeenCalledWith(
          'getAllRecords:page',
          objectLike({
            eventId: 'baz',
            indexName: 'my_index',
            currentPage: 1,
            maxPages: 2,
          })
        );
        expect(pulse.emit).toHaveBeenCalledWith(
          'getAllRecords:page',
          objectLike({
            eventId: 'baz',
            indexName: 'my_index',
            currentPage: 2,
            maxPages: 2,
          })
        );
      });

      // Paginate twice, then stop
      browser.emit('result', { page: 0, nbPages: 2, hits: [] });
      browser.emit('result', { page: 1, nbPages: 2, hits: [] });
      browser.emit('end');

      return actual;
    });

    describe('with error', () => {
      it('should return an empty list if error in the index', () => {
        expect.assertions(2);

        uuid.mockReturnValue('baz');
        mockIndex.browseAll.mockImplementation(() => {
          throw new Error();
        });

        const actual = module.getAllRecords('my_index').then(results => {
          expect(results).toEqual([]);
          expect(pulse.emit).toHaveBeenCalledWith(
            'getAllRecords:end',
            objectLike({
              eventId: 'baz',
              indexName: 'my_index',
            })
          );
        });

        return actual;
      });

      it('should return an empty list if error when browsing', () => {
        expect.assertions(2);
        uuid.mockReturnValue('baz');

        const actual = module.getAllRecords('my_index').then(results => {
          expect(results).toEqual([]);
          expect(pulse.emit).toHaveBeenCalledWith(
            'getAllRecords:end',
            objectLike({
              eventId: 'baz',
              indexName: 'my_index',
            })
          );
        });

        browser.emit('error');

        return actual;
      });
    });
  });
});
