/* eslint-disable import/no-commonjs */
import module from './main';
import helper from './test-helper';

describe('algolia', () => {
  beforeEach(helper.globalBeforeEach);

  describe('init', () => {
    describe('when passing wrong input', () => {
      it('should throw if no apiKey given', () => {
        const credentials = { appId: 'foo' };

        const actual = () => {
          module.init(credentials);
        };

        expect(actual).toThrow();
      });

      it('should throw if no appId given', () => {
        const credentials = { apiKey: 'foo' };

        const actual = () => {
          module.init(credentials);
        };

        expect(actual).toThrow();
      });
    });

    describe('when passing correct input', () => {
      let mockGetClient;
      beforeEach(() => {
        mockGetClient = helper.mockPrivate(module, 'getClient');
      });

      it('should return an object with a client', () => {
        mockGetClient.mockReturnValue('my_client');
        const credentials = { foo: 'bar' };

        const actual = module.init(credentials);

        expect(mockGetClient).toHaveBeenCalledWith(credentials);
        expect(actual).toHaveProperty('client', 'my_client');
      });

      it('should return an object with a .fullAtomic method', () => {
        mockGetClient.mockReturnValue('my_client');

        const credentials = {};

        const actual = module.init(credentials);

        expect(actual).toHaveProperty('fullAtomic', expect.any(Function));
      });
    });
  });
});
