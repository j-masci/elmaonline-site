import Seq, { Model } from 'sequelize';
import * as _ from 'lodash';
import { strict as assert } from 'assert';
import * as Ps from './PlayStats';
import sequelize from '../sequelize';
import { PlayStats } from './index';

// store this many top times.
const topXTimes = 10;

export const ddl = {
  LevelStatsIndex: {
    type: Seq.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  LevelIndex: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  ...Ps.getCommonCols(),
  // ie. '2020-06-25 19:05:59',
  LastDriven: {
    type: Seq.STRING(19),
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
        type: Seq.INTEGER,
        allowNull: true,
      };

      ret[`KuskiTime${i}`] = {
        type: Seq.INTEGER,
        allowNull: true,
      };
    });

    return ret;
  })(),
  // this allows us to validate level stats by comparing
  // with the time table up to this point. We cannot do this
  // with the levelStatsUpdate data alone because not all
  // levelStats get updated in a single batch.
  LastPossibleTimeIndex: {
    type: Seq.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
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

  // ie. add aggregates to an existing database row or null
  /**
   *
   * @param {array} aggs
   * @param {LevelStats|null} prev
   * @returns {{}}
   */
  static buildRecord = (aggs, prev) => {
    // most columns
    const record = Ps.buildCommonRecord(aggs, prev);

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

  static getUpdateOnDuplicateKeys = () => {
    return Object.keys(ddl).filter(
      key => !_.includes(['LevelStatsIndex', 'LevelIndex'], key),
    );
  };

  // converts time table records to an array of updates that need to be made
  // to the levelStats table.
  static processTimes = async (times, lastPossibleTimeIndex) => {
    const timesByLevel = _.groupBy(times, 'LevelIndex');

    // ids mapped to LevelStats objects, or null
    const exLevelStats = await LevelStats.mapIds(Object.keys(timesByLevel));

    // level indexes mapped to aggregate objects
    const updates = _.mapValues(timesByLevel, (levelTimes, LevelIndex) => {
      const aggs = PlayStats.aggregateTimes(levelTimes);

      const ex = exLevelStats[LevelIndex];
      assert(
        ex === null || _.isObjectLike(ex),
        `Expected null or a LevelStats instance, got ${typeof ex}`,
      );

      const record = LevelStats.buildRecord(aggs, ex);

      record.lastPossibleTimeIndex = +lastPossibleTimeIndex;

      return record;
    });

    return [_.values(updates), exLevelStats];
  };
}

LevelStats.init(ddl, {
  sequelize,
  tableName: 'levelStats_dev8',
  indexes: [
    { unique: true, fields: ['LevelIndex'] },
    { fields: ['LevelStatsIndex', 'LevelIndex'] },
  ],
});

export default LevelStats;
