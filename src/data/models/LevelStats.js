import Sequelize, { Model } from 'sequelize';
import * as _ from 'lodash';
import { strict as assert } from 'assert';
import * as Ps from './PlayStats';
import sequelizeInstance from '../sequelize';

// store this many top times.
const topXTimes = 10;

export const ddl = {
  LevelStatsIndex: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  LevelIndex: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  ...Ps.getCommonCols(),
  // ie. '2020-06-25 19:05:59',
  LastDriven: {
    type: Sequelize.STRING(19),
    allowNull: true,
  },
  // BattleTopTime: timeCol(),
  // BattleTopKuski: timeCol(),
  // KuskiIndex0, KuskiTime0, KuskiIndex1, KuskiTime1, etc.
  ...(() => {
    const ret = {};

    // 0 to 9
    _.range(0, topXTimes).forEach(i => {
      ret[`KuskiIndex${i}`] = {
        type: Sequelize.INTEGER,
        allowNull: true,
      };

      ret[`KuskiTime${i}`] = {
        type: Sequelize.INTEGER,
        allowNull: true,
      };
    });

    return ret;
  })(),
};

class LevelStats extends Model {
  // returns an array of objects representing the top times
  // for the level. The size of the array is limited by the number
  // of top times, which could be less than 10, and even 0.
  getTopTimes = () => {
    const ret = _.range(0, topXTimes).map(i => {
      const Time = this.getDataValue(`KuskiTime${i}`);
      const KuskiIndex = this.getDataValue(`KuskiIndex${i}`);

      return Time && Time > 0
        ? {
            Time,
            KuskiIndex,
          }
        : null;
    });

    return ret.filter(v => v !== null);
  };

  static getColumns = () => {
    return Object.keys(ddl);
  };

  // ie. add aggregates to an existing database row or null
  static buildRecord = (aggs, prev) => {
    // most columns
    const record = Ps.buildCommonRecord(aggs, prev || {});

    let exTopTimes;

    if (prev !== null) {
      record.LevelStatsIndex = prev.LevelStatsIndex;
      assert(prev.LevelIndex === aggs.LevelIndex);
      record.LevelIndex = aggs.LevelIndex;
      exTopTimes = prev.getTopTimes();

      if (aggs.LastDriven > prev.LastDriven) {
        record.LastDriven = aggs.LastDriven;
      }
    } else {
      exTopTimes = [];
      record.LastDriven = aggs.LastDriven;
      record.LevelIndex = aggs.LevelIndex;
    }

    const allTopTimes = exTopTimes.concat(aggs.topTimes);

    const newTopTimes = _.sortBy(allTopTimes, 'Time').slice(0, topXTimes);

    // Top X times
    _.range(0, topXTimes).forEach(i => {
      record[`KuskiIndex${i}`] = newTopTimes[i]
        ? newTopTimes[i].KuskiIndex
        : null;

      record[`KuskiTime${i}`] = newTopTimes[i] ? newTopTimes[i].Time : null;
    });

    return record;
  };

  // map an array of ids to existing instances or null
  // returns an object, indexed by ID.
  static mapIds = async levelIds => {
    const records = await LevelStats.findAll({
      where: {
        LevelIndex: levelIds,
      },
    });

    return Ps.mapIds(levelIds, records, 'LevelIndex');
  };
}

LevelStats.init(ddl, {
  sequelize: sequelizeInstance,
  tableName: 'levelStats_dev6',
  indexes: [
    { unique: true, fields: ['LevelIndex'] },
    { fields: ['LevelStatsIndex', 'LevelIndex'] },
  ],
});

export default LevelStats;
