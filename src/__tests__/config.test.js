import module from '../config';

describe('config', () => {
  describe('read', () => {
    it('reads a specific config key', () => {
      module.config = { foo: 'bar' };

      const actual = module.read('foo');

      expect(actual).toEqual('bar');
    });
  });

  describe('update', () => {
    it('updates an existing config value', () => {
      module.config = { foo: 'bar' };
      module.update({ foo: 'baz' });

      const actual = module.read('foo');

      expect(actual).toEqual('baz');
    });
  });
});
