const current = require('../client.js');
const config = require('../config.js');
const pulse = require('firost/pulse');

describe('client', () => {
  const mockIndex = {
    browseObjects: jest.fn(),
    clearObjects: jest.fn(),
    exists: jest.fn(),
    setSettings: jest.fn(),
  };
  const clearObjectsWait = jest.fn();
  const setSettingsWait = jest.fn();
  const mockClient = {
    multipleBatch: jest.fn(),
    copyIndex: jest.fn(),
    initIndex: jest.fn(),
    moveIndex: jest.fn(),
  };
  const copyIndexWait = jest.fn();
  const moveIndexWait = jest.fn();
  const multipleBatchWait = jest.fn();
  beforeEach(() => {
    jest.spyOn(current, '__algoliasearch').mockReturnValue(mockClient);
    jest.spyOn(current, 'index').mockReturnValue(mockIndex);
    mockIndex.clearObjects.mockReturnValue({ wait: clearObjectsWait });
    mockIndex.setSettings.mockReturnValue({ wait: setSettingsWait });
    mockClient.copyIndex.mockReturnValue({ wait: copyIndexWait });
    mockClient.moveIndex.mockReturnValue({ wait: moveIndexWait });
    mockClient.multipleBatch.mockReturnValue({ wait: multipleBatchWait });
    mockClient.initIndex.mockReturnValue(mockIndex);
    jest.spyOn(pulse, 'emit').mockReturnValue();
    current.init();
  });

  describe('init', () => {
    it('should init a new algoliaclient', () => {
      current.client = 'dirty client';
      current.__algoliasearch.mockReturnValue('new client');

      current.init();

      expect(current.client).toEqual('new client');
    });
  });

  describe('index', () => {
    it('should return the index object from the client', () => {
      mockClient.initIndex.mockReturnValue(mockIndex);

      const actual = current.index('foo');

      expect(actual).toEqual(mockIndex);
    });
  });

  describe('clearIndexSync', () => {
    it('should wait for clearObjects to finish', async () => {
      await current.clearIndexSync('indexName');
      expect(clearObjectsWait).toHaveBeenCalled();
    });
    it('should emit an error when failing', async () => {
      mockIndex.clearObjects.mockImplementation(() => {
        throw new Error();
      });
      await current.clearIndexSync('indexName');
      expect(pulse.emit).toHaveBeenCalledWith('error', expect.anything());
    });
    it('should emit start and end events', async () => {
      jest.spyOn(current, '__uuid').mockReturnValue('abcdef');
      await current.clearIndexSync('indexName');
      expect(pulse.emit).toHaveBeenCalledWith('clearIndex.start', {
        eventId: 'abcdef',
        indexName: 'indexName',
      });
      expect(pulse.emit).toHaveBeenCalledWith('clearIndex.end', {
        eventId: 'abcdef',
        indexName: 'indexName',
      });
    });
  });

  describe('copyIndexSync', () => {
    beforeEach(async () => {
      mockIndex.exists.mockReturnValue(true);
    });
    it('should create the source first if it does not exist', async () => {
      mockIndex.exists.mockReturnValue(false);
      jest.spyOn(current, 'createIndexSync').mockReturnValue();
      await current.copyIndexSync('fromIndex', 'toIndex');
      expect(current.createIndexSync).toHaveBeenCalledWith('fromIndex');
    });
    it('should wait for copyIndex to finish', async () => {
      await current.copyIndexSync('fromIndex', 'toIndex');
      expect(copyIndexWait).toHaveBeenCalled();
    });
    it('should emit an error when failing', async () => {
      mockClient.copyIndex.mockImplementation(() => {
        throw new Error();
      });
      await current.copyIndexSync('fromIndex', 'toIndex');
      expect(pulse.emit).toHaveBeenCalledWith('error', expect.anything());
    });
    it('should emit start and end events', async () => {
      jest.spyOn(current, '__uuid').mockReturnValue('abcdef');
      await current.copyIndexSync('fromIndex', 'toIndex');
      expect(pulse.emit).toHaveBeenCalledWith('copyIndex.start', {
        eventId: 'abcdef',
        source: 'fromIndex',
        destination: 'toIndex',
      });
      expect(pulse.emit).toHaveBeenCalledWith('copyIndex.end', {
        eventId: 'abcdef',
        source: 'fromIndex',
        destination: 'toIndex',
      });
    });
  });

  describe('moveIndexSync', () => {
    beforeEach(async () => {
      mockIndex.exists.mockReturnValue(true);
    });
    it('should create the source first if it does not exist', async () => {
      mockIndex.exists.mockReturnValue(false);
      jest.spyOn(current, 'createIndexSync').mockReturnValue();
      await current.moveIndexSync('fromIndex', 'toIndex');
      expect(current.createIndexSync).toHaveBeenCalledWith('fromIndex');
    });
    it('should wait for moveIndex to finish', async () => {
      await current.moveIndexSync('fromIndex', 'toIndex');
      expect(moveIndexWait).toHaveBeenCalled();
    });
    it('should emit an error when failing', async () => {
      mockClient.moveIndex.mockImplementation(() => {
        throw new Error();
      });
      await current.moveIndexSync('fromIndex', 'toIndex');
      expect(pulse.emit).toHaveBeenCalledWith('error', expect.anything());
    });
    it('should emit start and end events', async () => {
      jest.spyOn(current, '__uuid').mockReturnValue('abcdef');
      await current.moveIndexSync('fromIndex', 'toIndex');
      expect(pulse.emit).toHaveBeenCalledWith('moveIndex.start', {
        eventId: 'abcdef',
        source: 'fromIndex',
        destination: 'toIndex',
      });
      expect(pulse.emit).toHaveBeenCalledWith('moveIndex.end', {
        eventId: 'abcdef',
        source: 'fromIndex',
        destination: 'toIndex',
      });
    });
  });

  describe('setSettingsSync', () => {
    it('should wait for setSettings to finish', async () => {
      await current.setSettingsSync('indexName', { key: 'value' });
      expect(setSettingsWait).toHaveBeenCalled();
    });
    it('should emit an error when failing', async () => {
      mockIndex.setSettings.mockImplementation(() => {
        throw new Error();
      });
      await current.setSettingsSync('indexName', { key: 'value' });
      expect(pulse.emit).toHaveBeenCalledWith('error', expect.anything());
    });
    it('should emit start and end events', async () => {
      jest.spyOn(current, '__uuid').mockReturnValue('abcdef');
      await current.setSettingsSync('indexName', { key: 'value' });
      expect(pulse.emit).toHaveBeenCalledWith('setSettings.start', {
        eventId: 'abcdef',
        indexName: 'indexName',
        settings: { key: 'value' },
      });
      expect(pulse.emit).toHaveBeenCalledWith('setSettings.end', {
        eventId: 'abcdef',
        indexName: 'indexName',
        settings: { key: 'value' },
      });
    });
  });

  describe('configureReplicasSync', () => {
    it('should set the default replicas array if passed as such', async () => {
      const settings = { replicas: ['one', 'two'] };
      await current.configureReplicasSync('indexName', settings);

      expect(mockIndex.setSettings).toHaveBeenCalledTimes(1);
      expect(mockIndex.setSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          ...settings,
        })
      );
    });
    it('should update the replicas on the main index', async () => {
      const settings = { replicas: { one: {}, two: {} } };
      await current.configureReplicasSync('indexName', settings);

      expect(mockIndex.setSettings).toHaveBeenCalledWith({
        replicas: ['indexName_one', 'indexName_two'],
      });
    });
    it('should update settings of all replicas', async () => {
      const settings = {
        searchableAttributes: ['title'],
        customRanking: ['desc(score)'],
        replicas: {
          date_desc: {
            customRanking: ['desc(date)'],
          },
          date_asc: {
            customRanking: ['asc(date)'],
          },
        },
      };

      const mockIndices = {};
      jest.spyOn(current, 'index').mockImplementation((indexName) => {
        const namedIndex = {
          setSettings: jest.fn().mockReturnValue({ wait() {} }),
        };
        mockIndices[indexName] = namedIndex;
        return namedIndex;
      });

      await current.configureReplicasSync('indexName', settings);

      expect(mockIndices.indexName.setSettings).toHaveBeenCalledWith({
        replicas: ['indexName_date_desc', 'indexName_date_asc'],
      });
      expect(mockIndices.indexName_date_desc.setSettings).toHaveBeenCalledWith({
        customRanking: ['desc(date)'],
        searchableAttributes: ['title'],
      });
      expect(mockIndices.indexName_date_asc.setSettings).toHaveBeenCalledWith({
        customRanking: ['asc(date)'],
        searchableAttributes: ['title'],
      });
    });
    it('should emit start and end events', async () => {
      const settings = {
        searchableAttributes: ['title'],
        customRanking: ['desc(score)'],
        replicas: {
          date_desc: {
            customRanking: ['desc(date)'],
          },
          date_asc: {
            customRanking: ['asc(date)'],
          },
        },
      };
      jest.spyOn(current, '__uuid').mockReturnValue('abcdef');

      await current.configureReplicasSync('indexName', settings);

      expect(pulse.emit).toHaveBeenCalledWith('configureReplicas.start', {
        eventId: 'abcdef',
        indexName: 'indexName',
      });
      expect(pulse.emit).toHaveBeenCalledWith('configureReplicas.end', {
        eventId: 'abcdef',
        indexName: 'indexName',
      });
    });
  });

  describe('getAllRecords', () => {
    beforeEach(async () => {
      mockIndex.exists.mockReturnValue(true);
    });
    it('should aggregate all records returned by browseObject', async () => {
      mockIndex.browseObjects.mockImplementation((options) => {
        options.batch(['record1']);
        options.batch(['record2']);
        options.batch(['record3']);
      });
      const actual = await current.getAllRecords('indexName', { key: 'value' });
      expect(actual).toEqual(['record1', 'record2', 'record3']);
    });
    it('should emit an error when failing', async () => {
      mockIndex.browseObjects.mockImplementation(() => {
        throw new Error();
      });
      await current.getAllRecords('indexName', { key: 'value' });
      expect(pulse.emit).toHaveBeenCalledWith('error', expect.anything());
    });
    it('should return an empty array if the index does not exist', async () => {
      jest.spyOn(current, '__uuid').mockReturnValue('abcdef');
      mockIndex.exists.mockReturnValue(false);
      mockIndex.browseObjects.mockImplementation(() => {
        throw new Error();
      });
      const actual = await current.getAllRecords('indexName');
      expect(actual).toEqual([]);
      expect(pulse.emit).toHaveBeenCalledWith('getAllRecords.end', {
        eventId: 'abcdef',
        indexName: 'indexName',
      });
    });
    it('should emit start and end events', async () => {
      jest.spyOn(current, '__uuid').mockReturnValue('abcdef');
      await current.getAllRecords('indexName', { key: 'value' });
      expect(pulse.emit).toHaveBeenCalledWith('getAllRecords.start', {
        eventId: 'abcdef',
        indexName: 'indexName',
      });
      expect(pulse.emit).toHaveBeenCalledWith('getAllRecords.end', {
        eventId: 'abcdef',
        indexName: 'indexName',
      });
    });
  });

  describe('runBatchSync', () => {
    it('does nothing if no batch to process', async () => {
      const input = [];
      await current.runBatchSync(input);
      expect(mockClient.multipleBatch).not.toHaveBeenCalled();
    });
    it('should use a default batch size and concurrency', async () => {
      jest.spyOn(config, 'read').mockImplementation((key) => {
        const defaultValues = {
          batchMaxSize: 2,
          batchMaxConcurrency: 42,
        };
        return defaultValues[key];
      });
      jest.spyOn(current, '__pMap');

      const input = ['one', 'two', 'three', 'four', 'five', 'six'];
      await current.runBatchSync(input);

      expect(current.__pMap).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          concurrency: 42,
        }
      );
      expect(mockClient.multipleBatch).toHaveBeenCalledTimes(3);
    });
    it('should allow changing the batch size and concurrency', async () => {
      jest.spyOn(current, '__pMap');
      const input = ['one', 'two', 'three', 'four', 'five', 'six'];

      await current.runBatchSync(input, { batchSize: 3, concurrency: 8 });

      expect(current.__pMap).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          concurrency: 8,
        }
      );
      expect(mockClient.multipleBatch).toHaveBeenCalledTimes(2);
    });
    it('should wait for each batch to finish', async () => {
      const input = ['one', 'two', 'three', 'four', 'five', 'six'];
      await current.runBatchSync(input, { batchSize: 3 });

      expect(multipleBatchWait).toHaveBeenCalledTimes(2);
    });
    it('should emit an error when failing', async () => {
      const input = ['one', 'two', 'three', 'four', 'five', 'six'];
      mockClient.multipleBatch.mockImplementation(() => {
        throw new Error();
      });
      await current.runBatchSync(input);
      expect(pulse.emit).toHaveBeenCalledWith('error', expect.anything());
    });
    it('should emit start, chunk and end events', async () => {
      const input = ['one', 'two'];
      jest.spyOn(current, '__uuid').mockReturnValue('abcdef');
      await current.runBatchSync(input, { batchSize: 1 });
      expect(pulse.emit).toHaveBeenCalledWith('batch.start', {
        eventId: 'abcdef',
        maxOperationCount: 2,
        currentOperationCount: 0,
      });
      expect(pulse.emit).toHaveBeenCalledWith('batch.chunk', {
        eventId: 'abcdef',
        maxOperationCount: 2,
        currentOperationCount: 1,
      });
      expect(pulse.emit).toHaveBeenCalledWith('batch.chunk', {
        eventId: 'abcdef',
        maxOperationCount: 2,
        currentOperationCount: 2,
      });
      expect(pulse.emit).toHaveBeenCalledWith('batch.end', {
        eventId: 'abcdef',
      });
    });
  });
});
