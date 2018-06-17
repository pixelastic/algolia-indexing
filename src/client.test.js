/* eslint-disable import/no-commonjs */
import module from './client';
import helper from './test-helper';
import _ from 'lodash';

describe('client', () => {
  beforeEach(helper.globalBeforeEach);

  describe('constructor', () => {
    it('should throw if no apiKey', () => {
      const actual = () => {
        module('foo');
      };

      expect(actual).toThrow();
    });

    it('should throw if no appId', () => {
      const actual = () => {
        module(null, 'foo');
      };

      expect(actual).toThrow();
    });
  });
});
