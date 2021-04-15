// a playStats module which holds common functionality used in both LevelStats and KuskiStats models.
import { mapValues } from 'lodash';
import Sequelize from 'sequelize';
import { sumBy, maxBy } from 'lodash';

const timeCol = () => {
  // need bigger int?
  return {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
  };
};

// # of attempts... won't be too large
const attemptsCol = () => {
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

const getSumFunc = index => (aggs, prev) => aggs[index] + (prev[index] || 0);

const getMinFunc = index => (aggs, prev) =>
  Math.min(aggs[index], prev[index] || 0);

const getMaxFunc = index => (aggs, prev) =>
  Math.max(aggs[index], prev[index] || 0);

// use LevelStats/KuskiStats.getMergeStragegies, not this.
export const getCommonMergeStrategies = () => {
  return {
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

    // BattleTopTime: 'min',
    // BattleTopKuski: (aggs, prev) => {
    //   if (aggs.BattleTopTime < prev.BattleTopTime) {
    //     return aggs.BattleTopKuski;
    //   }
    //
    //   return prev.BattleTopKuski;
    // },
    // Kuski1Index: null,
    // Kuski1Time: null,
    // Kuski2Index: null,
    // Kuski2Time: null,
    // Kuski3Index: null,
    // Kuski3Time: null,
  };
};

// converts some string values to functions in the object
// provided.
const transformMergeStrategies = strats => {
  return mapValues(strats, (func, index) => {
    if (func === 'sum') {
      return getSumFunc(index);
    }

    if (func === 'min') {
      return getMinFunc(index);
    }

    if (func === 'max') {
      return getMaxFunc(index);
    }

    if (func === null) {
      return () => null;
    }

    return func;
  });
};

// merge an array of aggregate times with an existing row in the database
// or an empty object.
export const addAggregates = (aggs, prev = {}, strategies) => {
  const strats = transformMergeStrategies(strategies);

  return mapValues(strats, func => {
    return func(aggs, prev);
  });
};

// helps to ensure that columns ending with All are the sum of
// related cols ending with E, F, D
const timeFinishedAll = t => ['E', 'F', 'D'].indexOf(t.Finished) !== -1;

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
    [`${base}F`]: sumBy(times, time =>
      time.Finished === 'F' ? getter(time, col) : 0,
    ),
    [`${base}E`]: sumBy(times, time =>
      time.Finished === 'E' ? getter(time, col) : 0,
    ),
    [`${base}D`]: sumBy(times, time =>
      time.Finished === 'D' ? getter(time, col) : 0,
    ),
    [`${base}All`]: sumBy(times, time =>
      timeFinishedAll(time) ? getter(time, col) : 0,
    ),
  };
};

// ie. MaxSpeed
const maxGroup = (times, base, col) => {
  // eslint-disable-next-line no-param-reassign
  col = col || base;

  // because maxBy returns the entire object
  // eslint-disable-next-line no-underscore-dangle
  const _maxBy = iteratee => {
    return getter(maxBy(times, iteratee), iteratee);
  };

  return {
    [`${base}F`]: _maxBy(time =>
      time.Finished === 'F' ? getter(time, col) : 0,
    ),
    [`${base}E`]: _maxBy(time =>
      time.Finished === 'E' ? getter(time, col) : 0,
    ),
    [`${base}D`]: _maxBy(time =>
      time.Finished === 'D' ? getter(time, col) : 0,
    ),
    [`${base}All`]: _maxBy(time =>
      timeFinishedAll(time) ? getter(time, col) : 0,
    ),
  };
};

// aggregate a record set from the time table.
// its likely but not necessary that all records passed in
// share the same KuskiIndex or LevelIndex.
export const aggregateTimes = times => {
  return {
    Count: times.length,
    First: times[0],
    LevelIndex: times.length && times[0].LevelIndex,
    KuskiIndex: times.length && times[0].KuskiIndex,

    // SUM
    ...sumGroup(times, 'Time'),
    ...sumGroup(times, 'Apples'),
    ...sumGroup(times, 'ThrottleTime'),
    ...sumGroup(times, 'BrakeTime'),
    ...sumGroup(times, 'LeftVolt'),
    ...sumGroup(times, 'RightVolt'),
    ...sumGroup(times, 'SuperVolt'),
    ...sumGroup(times, 'Turn'),

    AttemptsF: sumBy(times, t => (t.Finished === 'F' ? 1 : 0)),
    AttemptsE: sumBy(times, t => (t.Finished === 'E' ? 1 : 0)),
    AttemptsD: sumBy(times, t => (t.Finished === 'D' ? 1 : 0)),
    AttemptsAll: sumBy(times, t => (timeFinishedAll(t) ? 1 : 0)),

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
