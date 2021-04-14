import moment from 'moment';
import DataType from 'sequelize';
import { sumBy, orderBy } from 'lodash';
import Model from '../sequelize';

const timeCol = () => {
  // need bigger int?
  return {
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  };
};

// # of attempts... won't be too large
const attemptsCol = () => {
  return {
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  };
};

const LevelStats = Model.define(
  // give the model same name as the db table
  'levelStats_dev1', // the actual MySQL table name
  {
    LevelStatsIndex: {
      type: DataType.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    LevelIndex: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
      foreignKey: true,
    },
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
    BattleTopTime: timeCol(),
    BattleTopKuski: timeCol(),
    // size of leader history
    LeadersCount: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Top X kuskis/times, Kuski1Index, Kuski1Time, etc.
    // ...(() => {
    //   const top = {};
    //
    //   for (let i = 1; i <= 3; i++) {
    //     top[`Kuski${i}Index`] = {
    //       type: DataType.INTEGER,
    //       allowNull: true,
    //       defaultValue: 0,
    //     };
    //
    //     top[`Kuski${i}Time`] = timeCol();
    //   }
    //
    //   return top;
    // })(),
    Kuski1Index: {
      type: DataType.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    Kuski1Time: timeCol(),
    Kuski2Index: {
      type: DataType.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    Kuski2Time: timeCol(),
    Kuski3Index: {
      type: DataType.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    Kuski3Time: timeCol(),
    // levelStats up to date from this point and backwards in times table
    LastTimeIndex: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    indexes: [{ fields: ['LevelStatsIndex', 'LevelIndex'] }],
  },
);

export const aggregate = times => {
  const cols = {
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

  const extra = {};

  times.forEach(t => {
    if (['F', 'D', 'E'].indexOf(t.Finished) > -1) {
      cols.TimeAll += t.Time;
      cols.AttemptsAll += 1;
      cols.ApplesAll += t.Apples;

      cols.MaxSpeedAll = Math.max(cols.MaxSpeedAll, t.MaxSpeed);
    }

    if (t.Finished === 'F') {
      cols.TimeF += t.Time;
      cols.AttemptsF += 1;
      cols.ApplesF += t.Apples;
      cols.MaxSpeedF = Math.max(cols.MaxSpeedF, t.MaxSpeed);
    } else if (t.Finished === 'D') {
      cols.TimeD += t.Time;
      cols.AttemptsD += 1;
      cols.ApplesD += t.Apples;
      cols.MaxSpeedD = Math.max(cols.MaxSpeedD, t.MaxSpeed);
    } else if (t.Finished === 'E') {
      cols.TimeE += t.Time;
      cols.AttemptsE += 1;
      cols.ApplesE += t.Apples;
      cols.MaxSpeedE = Math.max(cols.MaxSpeedE, t.MaxSpeed);
    }
  });

  return [cols, extra];
};

export default LevelStats;
