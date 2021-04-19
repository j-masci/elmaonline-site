// helps generate a simple array with time differences in mili-seconds.
// a dev tool mostly.
// usage: const track = getPerfTracker(); track(1); track(2); console.log track(null);
// eslint-disable-next-line import/prefer-default-export
export const getPerfTracker = (desc0 = 'start') => {
  // mili-seconds
  const t = () => {
    // is date() ok for performance measuring ?
    return parseInt(+new Date().getTime(), 10);
  };

  const start = t();

  const items = [[desc0, start]];

  // pass in desc null to only return current state.
  return function track(desc) {
    if (desc !== null) {
      items.push([desc, t() - start]);
    }

    return items;
  };
};
