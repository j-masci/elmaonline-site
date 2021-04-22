import * as _ from 'lodash';

// helps generate a simple array with time differences in mili-seconds.
// a dev tool mostly.
// usage: const track = getPerfTracker(); track(1); track(2); console.log track(null);
// eslint-disable-next-line import/prefer-default-export
export const getPerfTracker = (desc0 = 'start') => {
  // mili-seconds
  const t = () => {
    return _.now();
  };

  const data = {
    start: t(),
    desc: desc0,
    units: 'ms',
    events: [],
  };

  // pass in desc null to only return current state.
  return function track(desc) {
    if (desc !== null) {
      const now = t();

      // timestamp at last even or at start
      const timeLast =
        data.events.length > 0
          ? data.start + data.events[0].sinceStart
          : data.start;

      data.events.push({
        desc,
        sinceLast: now - timeLast,
        sinceStart: now - data.start,
      });
    }

    return data;
  };
};

// aggregate many performance trackers. useful when you
// want to track performance inside a function that gets
// called many times inside a loop. Just make sure you use
// the same description each time you call track().
export const aggregateTrackers = trackers => {
  // all events in single array
  const allEvents = _.flatMap(trackers, tr => tr.events);

  // ie. { desc1: [ ev1, ev2 ], desc2: ... }
  const grouped = _.groupBy(allEvents, ev => ev.desc);

  // the sum of sinceLast for all events with same description.
  return _.mapValues(grouped, evs => {
    return _.sumBy(evs, ev => ev.sinceLast);
  });
};
