// a playStats module which holds common functionality used in both LevelStats and KuskiStats models.
import Sequelize from 'sequelize';
import sequelize from 'data/sequelize';
import * as _ from 'lodash';
import moment from 'moment';
import { getOne, getCol } from 'utils/sequelize';
import { strict as assert } from 'assert';

// times longer than this can be treated as this
// instead, to deter ppl from inflating playtime on their levels.
// todo: not implemented yet.
const maxTimeSingleRun = 360000;

export const timeCol = () => {
  // INTEGER seems large enough based on my calculations, but
  // i'd rather not trust those.
  return {
    type: Sequelize.BIGINT,
    allowNull: false,
    defaultValue: 0,
  };
};

// generic integer column for counting things that aren't
// incredibly large.
export const attemptsCol = () => {
  return {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
  };
};

// column definitions likely shared between LevelStats
// and KuskiStats (Kuski not implemented yet however).
// LevelStatsDaily or KuskiLevelStats, if those ever become
// a thing, may also use this.
export const getCommonCols = () => ({
  TimeF: timeCol(),
  TimeD: timeCol(),
  TimeE: timeCol(),
  TimeAll: timeCol(),
  AttemptsF: attemptsCol(),
  AttemptsD: attemptsCol(),
  AttemptsE: attemptsCol(),
  AttemptsAll: attemptsCol(),
  ApplesF: attemptsCol(),
  ApplesD: attemptsCol(),
  ApplesE: attemptsCol(),
  ApplesAll: attemptsCol(),
  MaxSpeedF: attemptsCol(),
  MaxSpeedD: attemptsCol(),
  MaxSpeedE: attemptsCol(),
  MaxSpeedAll: attemptsCol(),
  ThrottleTimeF: attemptsCol(),
  ThrottleTimeD: attemptsCol(),
  ThrottleTimeE: attemptsCol(),
  ThrottleTimeAll: attemptsCol(),
  BrakeTimeF: attemptsCol(),
  BrakeTimeD: attemptsCol(),
  BrakeTimeE: attemptsCol(),
  BrakeTimeAll: attemptsCol(),
  LeftVoltF: attemptsCol(),
  LeftVoltD: attemptsCol(),
  LeftVoltE: attemptsCol(),
  LeftVoltAll: attemptsCol(),
  RightVoltF: attemptsCol(),
  RightVoltD: attemptsCol(),
  RightVoltE: attemptsCol(),
  RightVoltAll: attemptsCol(),
  SuperVoltF: attemptsCol(),
  SuperVoltD: attemptsCol(),
  SuperVoltE: attemptsCol(),
  SuperVoltAll: attemptsCol(),
  TurnF: attemptsCol(),
  TurnD: attemptsCol(),
  TurnE: attemptsCol(),
  TurnAll: attemptsCol(),
});

/**
 * Build part of the record that will eventually get inserted
 * or updated in the database. Indexes are database columns.
 *
 * Specifies approximately (or exactly) columns in getCommonCols()
 *
 * @param {Object} aggs - returned object from aggregateTimes
 * @param {LevelStats|null} prev
 * @returns {Object}
 */
export const buildCommonUpdate = (aggs, prev) => {
  // might convert null to empty object
  // eslint-disable-next-line no-param-reassign
  prev = prev || {};

  // indexes are database columns.
  // values can be functions which take (aggs, prev || {})
  const cols = {
    // SUM
    TimeF: 'sum',
    TimeD: 'sum',
    TimeE: 'sum',
    TimeAll: 'sum',
    AttemptsF: 'sum',
    AttemptsD: 'sum',
    AttemptsE: 'sum',
    AttemptsAll: 'sum',
    ApplesF: 'sum',
    ApplesD: 'sum',
    ApplesE: 'sum',
    ApplesAll: 'sum',
    ThrottleTimeF: 'sum',
    ThrottleTimeD: 'sum',
    ThrottleTimeE: 'sum',
    ThrottleTimeAll: 'sum',
    BrakeTimeF: 'sum',
    BrakeTimeD: 'sum',
    BrakeTimeE: 'sum',
    BrakeTimeAll: 'sum',
    LeftVoltF: 'sum',
    LeftVoltD: 'sum',
    LeftVoltE: 'sum',
    LeftVoltAll: 'sum',
    RightVoltF: 'sum',
    RightVoltD: 'sum',
    RightVoltE: 'sum',
    RightVoltAll: 'sum',
    SuperVoltF: 'sum',
    SuperVoltD: 'sum',
    SuperVoltE: 'sum',
    SuperVoltAll: 'sum',
    TurnF: 'sum',
    TurnD: 'sum',
    TurnE: 'sum',
    TurnAll: 'sum',

    // MAX
    MaxSpeedF: 'max',
    MaxSpeedD: 'max',
    MaxSpeedE: 'max',
    MaxSpeedAll: 'max',
  };

  return _.mapValues(cols, (value, index) => {
    if (typeof value === 'function') {
      return value(aggs, prev);
    }

    if (value === 'sum') {
      return aggs[index] + (prev[index] || 0);
    }

    if (value === 'max') {
      return Math.max(aggs[index], prev[index] || 0);
    }

    return value;
  });
};

// true if t.Finished is E, F, or D.
// columns ending in All are the sum of E, F, and D, which is not
// the same as all runs in the time table.
export const timeFinishedAll = t => ['E', 'F', 'D'].indexOf(t.Finished) !== -1;

// silly helper for below.
const getter = (obj, key) => {
  if (typeof key === 'function') {
    return key(obj);
  }

  return obj[key];
};

// helper for aggregating times
const sumGroup = (times, base, col) => {
  // eslint-disable-next-line no-param-reassign
  col = col || base;
  return {
    [`${base}F`]: _.sumBy(times, time =>
      time.Finished === 'F' ? getter(time, col) : 0,
    ),
    [`${base}E`]: _.sumBy(times, time =>
      time.Finished === 'E' ? getter(time, col) : 0,
    ),
    [`${base}D`]: _.sumBy(times, time =>
      time.Finished === 'D' ? getter(time, col) : 0,
    ),
    [`${base}All`]: _.sumBy(times, time =>
      timeFinishedAll(time) ? getter(time, col) : 0,
    ),
  };
};

// helper for aggregating times
const maxGroup = (times, base, col) => {
  // eslint-disable-next-line no-param-reassign
  col = col || base;

  // because _.maxBy returns the entire object
  const maxBy = iteratee => {
    return getter(_.maxBy(times, iteratee), iteratee);
  };

  return {
    [`${base}F`]: maxBy(time =>
      time.Finished === 'F' ? getter(time, col) : 0,
    ),
    [`${base}E`]: maxBy(time =>
      time.Finished === 'E' ? getter(time, col) : 0,
    ),
    [`${base}D`]: maxBy(time =>
      time.Finished === 'D' ? getter(time, col) : 0,
    ),
    [`${base}All`]: maxBy(time =>
      timeFinishedAll(time) ? getter(time, col) : 0,
    ),
  };
};

// WARNING: see getTopFinished (you might want that instead)
export const getTopTimes = (times, n) => {
  // times driven earlier take precedence
  const sorted = _.orderBy(times, ['Time', 'Driven'], ['ASC', 'ASC']);

  return sorted.slice(0, n);
};

export const getTopFinishes = (times, n) => {
  // eslint-disable-next-line no-underscore-dangle

  const finishes = times.filter(t => t.Finished === 'F');
  return getTopTimes(finishes, n);
};

// convert time.Driven to unix timestamp
const parseTimeDriven = d => parseInt(moment(d).format('X'), 10);

// aggregate an array of rows from the time table.
// expects an array of plain old javascript objects,
// where time.Driven is a timestamp.
export const aggregateTimes = times => {
  return {
    // useful if/when all times have the same kuski or level index.
    // it is up to the caller of this function to know if that's the case.
    LevelIndex: times.length && times[0].LevelIndex,
    KuskiIndex: times.length && times[0].KuskiIndex,

    // timestamp
    LastDriven: _.maxBy(times, 'Driven'),

    // SUM
    ...sumGroup(times, 'Time'),
    ...sumGroup(times, 'Apples'),
    ...sumGroup(times, 'ThrottleTime'),
    ...sumGroup(times, 'BrakeTime'),
    ...sumGroup(times, 'LeftVolt'),
    ...sumGroup(times, 'RightVolt'),
    ...sumGroup(times, 'SuperVolt'),
    ...sumGroup(times, 'Turn'),

    AttemptsF: _.sumBy(times, t => (t.Finished === 'F' ? 1 : 0)),
    AttemptsE: _.sumBy(times, t => (t.Finished === 'E' ? 1 : 0)),
    AttemptsD: _.sumBy(times, t => (t.Finished === 'D' ? 1 : 0)),
    AttemptsAll: _.sumBy(times, t => (timeFinishedAll(t) ? 1 : 0)),

    // MAX
    ...maxGroup(times, 'MaxSpeed'),

    BattleTopTime: null,
    BattleTopKuski: null,
  };
};

// returns an object with ids as keys, and one of records, or null, as values.
export const mapIdsToRecordsOrNull = (ids, records, recordIndex) => {
  const ret = {};

  ids.forEach(id => {
    ret[id] = null;
  });

  records.forEach(row => {
    ret[row[recordIndex]] = row;
  });

  return ret;
};

export const getMaxTimeIndex = async () =>
  getCol('SELECT MAX(TimeIndex) maxIndex FROM time', {}, 'maxIndex');

// returns an array of plain old javascript objects.
// queries all times from the min up to min + limit,
// and tells you the last time index that exists within
// that range (in case it hits the end of the table).
// optionally filters out times by finished and can map
// the Driven column to a timestamp.
export const getTimesInInterval = async (
  minTimeIndex,
  limit,
  filterFinished = true,
  mapDriven = true,
) => {
  const lastPossibleTimeIndex = +minTimeIndex + limit - 1;

  const largest = await getMaxTimeIndex();

  const moreTimesExist = lastPossibleTimeIndex < largest;

  // no where clause here. Will screw up coverage.
  let [times] = await sequelize.query(
    'SELECT * FROM time WHERE TimeIndex BETWEEN ? AND ? ORDER BY TimeIndex',
    {
      replacements: [minTimeIndex, lastPossibleTimeIndex],
    },
  );

  // ie. min 175000000, limit 1000000
  // coverage could be [175000000, 175396482]
  // if only 396482 times exist beyond 175000000.
  const coverage = [
    minTimeIndex,
    moreTimesExist ? lastPossibleTimeIndex : largest,
  ];

  // we often don't care about other finish types
  if (filterFinished) {
    times = times.filter(timeFinishedAll);
  }

  // best to map to timestamp once, as we'll need the timestamp
  // more than once overall in most cases.
  if (mapDriven) {
    times = times.map(t => {
      // eslint-disable-next-line no-param-reassign
      t.Driven = parseTimeDriven(t.Driven);
      return t;
    });
  }

  return [times, coverage, moreTimesExist];
};
