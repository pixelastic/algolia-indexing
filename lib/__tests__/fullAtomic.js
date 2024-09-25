import current from '../fullAtomic.js';
import client from '../client.js';

describe('fullAtomic', () => {
  describe('addUniqueObjectIdsToRecords', () => {
    beforeEach(async () => {
      vi.spyOn(current, '__hashMethod').mockReturnValue();
    });

    it('should add a unique object id to all records', () => {
      const input = [{ name: 'adam' }, { name: 'bob' }];
      current.__hashMethod.mockImplementation((item) => {
        return item.name;
      });

      const actual = current.addUniqueObjectIdToRecords(input);

      expect(actual[0]).toHaveProperty('objectID', 'adam');
      expect(actual[1]).toHaveProperty('objectID', 'bob');
    });
  });

  describe('getRemoteObjectIds', () => {
    beforeEach(async () => {
      vi.spyOn(client, 'getAllRecords').mockReturnValue();
    });
    it('should return an array of all contents', async () => {
      client.getAllRecords.mockReturnValue([
        { objectID: 'foo' },
        { objectID: 'bar' },
        { objectID: 'baz' },
      ]);

      const actual = await current.getRemoteObjectIds('my_index');

      expect(actual).toEqual(['foo', 'bar', 'baz']);
    });
    it('should only grab the content', async () => {
      await current.getRemoteObjectIds('my_index');

      expect(client.getAllRecords).toHaveBeenCalledWith(
        'my_index',
        expect.objectContaining({
          attributesToRetrieve: 'objectID',
        })
      );
    });
    it('should return an empty array if no object id', async () => {
      client.getAllRecords.mockReturnValue([]);

      const actual = await current.getRemoteObjectIds('my_index');

      expect(actual).toEqual([]);
    });
  });

  describe('getLocalObjectIds', () => {
    it('should get an empty array if no records', () => {
      const input = [];

      const actual = current.getLocalObjectIds(input);

      expect(actual).toEqual([]);
    });
    it('should get the list of object ids from the records', () => {
      const input = [{ objectID: 'foo' }, { objectID: 'bar' }];

      const actual = current.getLocalObjectIds(input);

      expect(actual).toEqual(['foo', 'bar']);
    });
  });

  describe('buildDiffBatch', () => {
    it('should delete all remote records if no local records', () => {
      const remoteIds = ['foo'];
      const records = [];
      const actual = current.buildDiffBatch(remoteIds, records, 'my_index');

      expect(actual).toEqual([
        {
          action: 'deleteObject',
          indexName: 'my_index',
          body: {
            objectID: 'foo',
          },
        },
      ]);
    });
    it('should add all local records if no local records', () => {
      const remoteIds = [];
      const records = [{ foo: 'bar' }];
      const actual = current.buildDiffBatch(remoteIds, records, 'my_index');

      expect(actual).toEqual([
        {
          action: 'addObject',
          indexName: 'my_index',
          body: { foo: 'bar' },
        },
      ]);
    });
    it('should delete then add if mix of local and remotes', () => {
      const remoteIds = ['foo', 'bar'];
      const records = [
        { name: 'foo', objectID: 'foo' },
        { name: 'baz', objectID: 'baz' },
      ];
      const actual = current.buildDiffBatch(remoteIds, records, 'my_index');

      expect(actual).toEqual([
        {
          action: 'deleteObject',
          indexName: 'my_index',
          body: {
            objectID: 'bar',
          },
        },
        {
          action: 'addObject',
          indexName: 'my_index',
          body: { name: 'baz', objectID: 'baz' },
        },
      ]);
    });
  });
});
