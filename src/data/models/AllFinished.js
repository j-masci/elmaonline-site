import DataType from 'sequelize';
import * as _ from 'lodash';
import Model from '../sequelize';

const AllFinished = Model.define(
  'allfinished',
  {
    AllFinishedIndex: {
      type: DataType.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    TimeIndex: {
      type: DataType.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    KuskiIndex: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    LevelIndex: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    Time: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    Apples: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    Driven: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    BattleIndex: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    '24httIndex': {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    MaxSpeed: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    ThrottleTime: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    BrakeTime: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    LeftVolt: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    RightVolt: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    SuperVolt: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    Turn: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    OneWheel: {
      type: DataType.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    indexes: [
      {
        fields: [
          'BattleIndex',
          'TimeIndex',
          'KuskiIndex',
          'LevelTime',
          'LevelIndex',
        ],
      },
    ],
  },
);

// gets all personal records from times, grouped by level and kuski.
// times should pretty much always be from the allfinished table.
// no point querying times when we only care for Finished === 'F'
// e.g.: { "2": { "38": [ TimeObj1, TimeObj2, TimeObj3 ], "122": [ {} ] }, "4": ... }
// 2 and 4 would be level indexes, 38 and 122 are kuski indexes.
export const personalRecordHistory = times => {
  // eslint-disable-next-line no-param-reassign
  times = times.filter(t => t.Finished === 'F');

  const byLev = _.groupBy(times, 'LevelIndex');

  return _.mapValues(byLev, levTimes => {
    let kuskiObj = _.groupBy(levTimes, 'KuskiIndex');

    kuskiObj = _.mapValues(kuskiObj, kuskiTimesArr => {
      // eslint-disable-next-line no-underscore-dangle
      const _times = _.orderBy(kuskiTimesArr, ['TimeIndex'], ['ASC']);

      const bestTimes = [];
      let best = 99999999;

      _times.forEach(t => {
        // if time is equal, oldest time wins.
        if (t.Time < best) {
          best = t.Time;
          bestTimes.push(t);
        }
      });

      return _.orderBy(bestTimes, 'TimeIndex', 'DESC');
    });

    return kuskiObj;
  });
};

export default AllFinished;
