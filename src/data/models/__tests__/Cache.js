import Cache from '../Cache';

describe('cache model', () => {
  test('basic setByType and getByType', async () => {
    await Cache.setByType('__test', 100, {
      Value: 'Just a test.',
      ExpiresAt: -1,
      Context: '',
    });

    const get = await Cache.getByType('__test', 100);

    expect(get.Value).toEqual('Just a test.');

    await get.destroy();
  });

  test('basic test for Cache.cachify()', async () => {
    const f = async x => {
      return {
        answer: x + 30,
      };
    };

    const f2 = Cache.cachify('__test_adder', f);

    const result1 = await f2(12);

    // should use cached value this time
    const result2 = await f2(12);

    expect(result1 && result1.answer).toEqual(42);
    expect(result2 && result2.answer).toEqual(42);
  });
});
