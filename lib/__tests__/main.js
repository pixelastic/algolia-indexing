import current from '../main.js';

describe('main', () => {
  describe('run', () => {
    it('should pass', async () => {
      const input = 'something';

      const actual = current.run(input);

      expect(actual).toBe('something');
    });
  });
});
