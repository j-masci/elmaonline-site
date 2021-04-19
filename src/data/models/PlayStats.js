// a playStats module which holds common functionality used in both LevelStats and KuskiStats models.
import Sequelize from 'sequelize';
import sequelize from 'data/sequelize';
import * as _ from 'lodash';
import moment from 'moment';

// times longer than this are can be treated as this
// instead, to deter ppl from inflating playtime on their levels.
// todo: not implemented yet.
const maxTimeSingleRun = 360000;

export const timeCol = () => {
  // INTEGER probably enough but i'm not willing to risk that i calculated
  // that properly. Hence bigint.
  return {
    type: Sequelize.BIGINT,
    allowNull: false,
    defaultValue: 0,
  };
};

// # of attempts... won't be too large
export const attemptsCol = () => {
  return {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
  };
};

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
 *
 * @param aggs
 * @param {LevelStats|null} prev
 * @returns {{ThrottleTimeF: unknown, ThrottleTimeE: unknown, ThrottleTimeD: unknown, ApplesAll: unknown, MaxSpeedF: unknown, MaxSpeedE: unknown, MaxSpeedD: unknown, BrakeTimeF: unknown, TurnD: unknown, BrakeTimeE: unknown, RightVoltF: unknown, TimeAll: unknown, BrakeTimeD: unknown, RightVoltE: unknown, AttemptsE: unknown, AttemptsD: unknown, ThrottleTimeAll: unknown, BrakeTimeAll: unknown, ApplesD: unknown, ApplesE: unknown, RightVoltD: unknown, ApplesF: unknown, TurnE: unknown, TurnF: unknown, TimeD: unknown, TimeF: unknown, TimeE: unknown, AttemptsF: unknown, SuperVoltAll: unknown, LeftVoltAll: unknown, SuperVoltF: unknown, SuperVoltE: unknown, SuperVoltD: unknown, TurnAll: unknown, AttemptsAll: unknown, LeftVoltE: unknown, LeftVoltD: unknown, MaxSpeedAll: unknown, LeftVoltF: unknown, RightVoltAll: unknown}}
 */
export const buildCommonRecord = (aggs, prev) => {
  // eslint-disable-next-line no-param-reassign
  prev = prev || {};

  // indexes are database columns.
  // values can be functions which takes (aggs, prev || {})
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

// helps to ensure that columns ending with All are the sum of
// related cols ending with E, F, D
export const timeFinishedAll = t => ['E', 'F', 'D'].indexOf(t.Finished) !== -1;

// just a silly helper for below.
// col is an iteratee as passed to lodash functions
// does lodash already provide this function ?
const getter = (obj, key) => {
  if (typeof key === 'function') {
    return key(obj);
  }

  return obj[key];
};

// ie. "TimeF", "TimeE", "TimeD", "TimeAll"
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

// ie. MaxSpeed
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

export const getTopFinishes = (times, n) => {
  // eslint-disable-next-line no-underscore-dangle
  const _times = _.sortBy(
    times.filter(t => t.Finished === 'F'),
    t => +t.Time,
  );

  return _times.reverse().slice(0, n);
};

// convert datetime column to timestamp int
const parseTimeDriven = d => parseInt(moment(d).format('X'), 10);

// aggregate an array of rows from the time table.
// DO NOT pass in model instances. These will have Driven columns
// already converted to timestamp, which causes issues when we try to
// do that again.
export const aggregateTimes = times => {
  return {
    Count: times.length,
    First: times[0],
    // useful if/when all times have the same kuski or level index.
    // it is up to the caller of this function to know if that's the case.
    LevelIndex: times.length && times[0].LevelIndex,
    KuskiIndex: times.length && times[0].KuskiIndex,

    // slow. if/when generating kuski stats, it would be a good idea to make this
    // optional (since it will not be useful data at that time)
    topTimes: getTopFinishes(times, 10),

    // timestamp
    LastDriven: _.maxBy(
      times.map(t => (timeFinishedAll(t) ? parseTimeDriven(t.Driven) : 0)),
    ),

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
    LeadersCount: 0,
    Kuski1Index: null,
    Kuski1Time: null,
    Kuski2Index: null,
    Kuski2Time: null,
    Kuski3Index: null,
    Kuski3Time: null,
  };
};

// returned object has ids as keys, and values as null or
// one of records.
export const mapIds = (ids, records, recordIndex) => {
  const ret = {};

  ids.forEach(id => {
    ret[id] = null;
  });

  records.forEach(row => {
    ret[row[recordIndex]] = row;
  });

  return ret;
};

export const getLargestTimeIndex = async () => {
  const [results] = await sequelize.query(
    'SELECT MAX(TimeIndex) last FROM time',
  );

  return results.length ? results[0].last : 0;
};

export const getTimesInInterval = async (minTimeIndex, limit) => {
  const lastPossibleTimeIndex = +minTimeIndex + limit - 1;

  const largest = await getLargestTimeIndex();

  const moreTimesExist = lastPossibleTimeIndex < largest;

  // do NOT use sequelize instances. Code later on (concerning Driven column)
  // relies on this being raw data.
  const [times] = await sequelize.query(
    'SELECT * FROM time WHERE TimeIndex BETWEEN ? AND ? ORDER BY TimeIndex',
    {
      replacements: [minTimeIndex, lastPossibleTimeIndex],
    },
  );

  const coverage = [
    minTimeIndex,
    moreTimesExist ? lastPossibleTimeIndex : largest,
  ];

  return [times, coverage, moreTimesExist];
};
