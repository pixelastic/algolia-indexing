import current from '../config.js';

describe('config', () => {
  describe('read', () => {
    it('reads a specific config key', () => {
      current.config = { foo: 'bar' };

      const actual = current.read('foo');

      expect(actual).toEqual('bar');
    });
  });

  describe('update', () => {
    it('updates an existing config value', () => {
      current.config = { foo: 'bar' };
      current.update({ foo: 'baz' });

      const actual = current.read('foo');

      expect(actual).toEqual('baz');
    });
  });
});
