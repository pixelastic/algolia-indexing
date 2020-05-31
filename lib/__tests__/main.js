const module = require('../main');

describe('module', () => {
  it('should do something', async () => {
    const input = 'foo';

    const actual = module.run(input);

    expect(actual).toEqual(true);
  });
});
