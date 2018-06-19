/* eslint-disable import/no-commonjs */
import module from './client';
import helper from './test-helper';
jest.mock('./pulse');
import pulse from './pulse';
jest.mock('algoliasearch');
import algoliasearch from 'algoliasearch';
const anyString = expect.any(String);

describe('client', () => {
  const mockIndex = {
    waitTask: jest.fn(),
    clearIndex: jest.fn(),
    setSettings: jest.fn(),
    getSettings: jest.fn(),
  };
  const mockClient = {
    copyIndex: jest.fn(),
    initIndex: jest.fn(),
    batch: jest.fn(),
  };
  beforeEach(helper.globalBeforeEach);
  beforeEach(() => {
    algoliasearch.mockReturnValue(mockClient);
    module.init();
  });

  describe('clearIndexSync', () => {
    it('should wait for the waitTask to complete', async () => {
      helper.mockPrivate(module, 'initIndex', mockIndex);
      mockIndex.clearIndex.mockReturnValue({ taskID: 1234 });

      await module.clearIndexSync('indexName');

      expect(mockIndex.waitTask).toHaveBeenCalledWith(1234);
    });

    it('should emit a start and end event', async () => {
      helper.mockPrivate(module, 'initIndex', mockIndex);
      mockIndex.clearIndex.mockReturnValue({ taskID: 1234 });

      await module.clearIndexSync('indexName');

      expect(pulse.emit).toHaveBeenCalledWith('clearIndex:start', 'indexName');
      expect(pulse.emit).toHaveBeenCalledWith('clearIndex:end', 'indexName');
    });

    describe('on error', () => {
      it('should emit an error if not possible', async () => {
        helper.mockPrivate(module, 'initIndex', mockIndex);
        mockIndex.clearIndex.mockImplementation(() => {
          throw new Error();
        });

        await module.clearIndexSync('indexName');

        expect(pulse.emit).toHaveBeenCalledWith('error', anyString);
      });
    });
  });

  describe('copyIndexSync', () => {
    describe('source does not exist', () => {
      beforeEach(() => {
        helper.mockPrivate(module, 'indexExists', false);
      });
      it('should create an empty index', async () => {
        helper.mockPrivate(module, 'initIndex', mockIndex);

        await module.copyIndexSync('foo', 'bar');

        expect(mockIndex.setSettings).toHaveBeenCalledWith({});
      });
    });

    describe('source exists', () => {
      beforeEach(() => {
        helper.mockPrivate(module, 'indexExists', true);
      });

      it('should wait for the waitTask to complete', async () => {
        mockClient.copyIndex.mockReturnValue({ taskID: 1234 });
        helper.mockPrivate(module, 'initIndex', mockIndex);

        await module.copyIndexSync('foo', 'bar');

        expect(mockIndex.waitTask).toHaveBeenCalledWith(1234);
      });

      it('should emit a start and end event', async () => {
        mockClient.copyIndex.mockReturnValue({ taskID: 1234 });
        helper.mockPrivate(module, 'initIndex', mockIndex);

        await module.copyIndexSync('foo', 'bar');

        expect(pulse.emit).toHaveBeenCalledWith('copyIndex:start', {
          source: 'foo',
          destination: 'bar',
        });
        expect(pulse.emit).toHaveBeenCalledWith('copyIndex:end', {
          source: 'foo',
          destination: 'bar',
        });
      });

      it('should emit an error', async () => {
        mockClient.copyIndex.mockImplementation(() => {
          throw new Error();
        });

        await module.copyIndexSync('foo', 'bar');

        expect(pulse.emit).toHaveBeenCalledWith('error', anyString);
      });
    });
  });

  describe('indexExists', () => {
    beforeEach(() => {
      helper.mockPrivate(module, 'initIndex', mockIndex);
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
      const mockInitIndex = helper.mockPrivate(module, 'initIndex', mockIndex);

      await module.runBatchSync(batches, userOptions);

      expect(mockInitIndex).toHaveBeenCalledWith('indexfoo');
      expect(mockInitIndex).toHaveBeenCalledWith('indexbar');
      expect(mockIndex.waitTask).toHaveBeenCalledWith(1234);
      expect(mockIndex.waitTask).toHaveBeenCalledWith(5678);
    });

    it('emits an error if cannot batch', async () => {
      const batches = ['foo', 'bar', 'baz'];
      const userOptions = { batchSize: 1 };
      mockClient.batch.mockImplementation(() => {
        throw new Error();
      });

      await module.runBatchSync(batches, userOptions);

      expect(pulse.emit).toHaveBeenCalledWith('error', anyString);
    });

    it('emits a start and end event', async () => {
      const batches = ['foo', 'bar', 'baz'];
      const userOptions = { batchSize: 1 };
      mockClient.batch.mockReturnValue({ taskID: {} });

      await module.runBatchSync(batches, userOptions);

      expect(pulse.emit).toHaveBeenCalledWith('batch:start', {
        batchCount: 3,
        batchSize: 1,
      });
      expect(pulse.emit).toHaveBeenCalledWith('batch:end');
    });

    it('emits chunk events', async () => {
      const batches = ['foo', 'bar', 'baz'];
      const userOptions = { batchSize: 2 };
      mockClient.batch.mockReturnValue({ taskID: {} });

      await module.runBatchSync(batches, userOptions);

      expect(pulse.emit).toHaveBeenCalledWith('batch:chunk', { chunkSize: 2 });
      expect(pulse.emit).toHaveBeenCalledWith('batch:chunk', { chunkSize: 1 });
    });
  });
});
