import module from '../full-atomic';
import helper from '../test-helper';
jest.mock('../client');
import client from '../client';
jest.mock('node-object-hash');
import nodeObjectHash from 'node-object-hash';
const mock = helper.mock(module);

describe('full-atomic', () => {
  describe('addUniqueObjectIdsToRecords', () => {
    const mockHash = jest.fn();
    beforeEach(() => {
      nodeObjectHash.mockReturnValue({ hash: mockHash });
    });

    it('should add a unique object id to all records', () => {
      const input = [{ foo: 'bar' }, { bar: 'baz' }];
      mockHash.mockImplementation(item => item);

      const actual = module.addUniqueObjectIdsToRecords(input);

      expect(actual[0]).toHaveProperty('objectID');
      expect(actual[1]).toHaveProperty('objectID');
      expect(actual[1].objectID).not.toEqual(actual[0].objectID);
    });

    it('should base the unique object id on the content', () => {
      const input = [{ foo: 'bar' }, { bar: 'baz', objectID: 'foo' }];
      nodeObjectHash.mockReturnValue({ hash: mockHash });

      module.addUniqueObjectIdsToRecords(input);

      expect(mockHash).toHaveBeenCalledWith({ foo: 'bar' });
      expect(mockHash).toHaveBeenCalledWith({ bar: 'baz' });
    });
  });

  describe('getRemoteObjectIds', () => {
    it('should return an array of all contents', async () => {
      client.getAllRecords.mockReturnValue([
        { content: ['foo', 'bar'] },
        { content: ['baz'] },
      ]);

      const actual = await module.getRemoteObjectIds('my_index');

      expect(actual).toEqual(['foo', 'bar', 'baz']);
    });
    it('should only grab the content', async () => {
      await module.getRemoteObjectIds('my_index');

      expect(client.getAllRecords).toHaveBeenCalledWith(
        'my_index',
        expect.objectContaining({
          attributesToRetrieve: 'content',
        })
      );
    });
    it('should return an empty array if no object ide', async () => {
      client.getAllRecords.mockReturnValue([]);

      const actual = await module.getRemoteObjectIds('my_index');

      expect(actual).toEqual([]);
    });
  });
});
