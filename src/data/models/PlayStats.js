// a playStats module which holds common functionality used in both LevelStats and KuskiStats models.
import { mapValues } from 'lodash';
import Sequelize from 'sequelize';

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
    MaxSpeedF: 'max',
    MaxSpeedD: 'max',
    MaxSpeedE: 'max',
    MaxSpeedAll: 'max',
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
export const merge = (aggs, prev = {}, strategies) => {
  const strats = transformMergeStrategies(strategies);

  return mapValues(strats, func => {
    return func(aggs, prev);
  });
};

// aggregate an array of rows from the times table.
// the input times may or may not have the same kuski or level index.
export const aggregateTimes = times => {
  const ret = {
    // useful if/when all times have the same level/kuski
    LevelIndex: times.length && times[0].LevelIndex,
    KuskiIndex: times.length && times[0].KuskiIndex,
    TimeF: 0,
    TimeD: 0,
    TimeE: 0,
    TimeAll: 0,
    AttemptsF: 0,
    AttemptsD: 0,
    AttemptsE: 0,
    AttemptsAll: 0,
    ApplesF: 0,
    ApplesD: 0,
    ApplesE: 0,
    ApplesAll: 0,
    BattleTopTime: null,
    BattleTopKuski: null,
    LeadersCount: 0,
    Kuski1Index: null,
    Kuski1Time: null,
    Kuski2Index: null,
    Kuski2Time: null,
    Kuski3Index: null,
    Kuski3Time: null,
    MaxSpeedF: 0,
    MaxSpeedD: 0,
    MaxSpeedE: 0,
    MaxSpeedAll: 0,
  };

  times.forEach(t => {
    if (['F', 'D', 'E'].indexOf(t.Finished) > -1) {
      ret.TimeAll += t.Time;
      ret.AttemptsAll += 1;
      ret.ApplesAll += t.Apples;

      ret.MaxSpeedAll = Math.max(ret.MaxSpeedAll, t.MaxSpeed);
    }

    if (t.Finished === 'F') {
      ret.TimeF += t.Time;
      ret.AttemptsF += 1;
      ret.ApplesF += t.Apples;
      ret.MaxSpeedF = Math.max(ret.MaxSpeedF, t.MaxSpeed);
    } else if (t.Finished === 'D') {
      ret.TimeD += t.Time;
      ret.AttemptsD += 1;
      ret.ApplesD += t.Apples;
      ret.MaxSpeedD = Math.max(ret.MaxSpeedD, t.MaxSpeed);
    } else if (t.Finished === 'E') {
      ret.TimeE += t.Time;
      ret.AttemptsE += 1;
      ret.ApplesE += t.Apples;
      ret.MaxSpeedE = Math.max(ret.MaxSpeedE, t.MaxSpeed);
    }
  });

  return ret;
};
