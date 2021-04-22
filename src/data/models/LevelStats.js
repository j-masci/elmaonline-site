import Seq, { Model } from 'sequelize';
import * as _ from 'lodash';
import { strict as assert } from 'assert';
import * as Ps from './PlayStats';
import sequelize from '../sequelize';
import { aggregateTrackers, getPerfTracker } from '../../utils/perf';

// store this many top times.
const countTopXTimes = 10;

// an array of arrays.
// if you slice and flatten, you'll get a one dimensional array of
// specified length. (eg. usage: query level stats with only top 3 times)
export const topXTimesColumns = _.range(0, countTopXTimes).map(i => {
  return [
    `TopKuskiIndex${i}`,
    `TopTime${i}`,
    `TopTimeIndex${i}`,
    `TopDriven${i}`,
  ];
});

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

  // ie. TopKuskiIndex0, TopTime0 ... TopTimeIndex9, TopDriven9
  // 40 columns
  ...(() => {
    const ret = {};

    _.range(0, countTopXTimes).forEach(x => {
      ret[`TopKuskiIndex${x}`] = {
        type: Seq.INTEGER,
        allowNull: true,
      };

      ret[`TopTime${x}`] = {
        type: Seq.INTEGER,
        allowNull: true,
      };

      ret[`TopTimeIndex${x}`] = {
        type: Seq.INTEGER,
        allowNull: true,
      };

      ret[`TopDriven${x}`] = {
        type: Seq.INTEGER,
        allowNull: true,
      };
    });

    return ret;
  })(),

  BattleTopTime: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  BattleTopTimeIndex: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  BattleTopKuskiIndex: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  BattleTopDriven: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  BattleTopBattleIndex: {
    type: Seq.INTEGER,
    allowNull: true,
  },

  // JSON array
  LeaderHistory: {
    type: Seq.TEXT('long'),
    allowNull: false,
    defaultValue: '',
    get() {
      return JSON.parse(this.getDataValue('LeaderHistory') || '[]');
    },
    set(arr) {
      this.setDataValue('LeaderHistory', JSON.stringify(arr));
    },
  },
  LeaderCount: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  UniqueLeaderCount: {
    type: Seq.INTEGER,
    allowNull: true,
  },

  // level stats should agree with the time table starting
  // from TimeIndex 1 up until this point.
  LastPossibleTimeIndex: {
    type: Seq.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },

  // virtual column returning an array of objects.
  // it's much easier to work with top times like this and this
  // should probably be passed to the front-end whenever possible.
  TopXTimes: {
    type: Seq.VIRTUAL,
    get() {
      return _.range(0, countTopXTimes).map(i => {
        // must have same indexes as times table, or code elsewhere will break.
        return {
          KuskiIndex: this.getDataValue(`TopKuskiIndex${i}`),
          Time: this.getDataValue(`TopTime${i}`),
          TimeIndex: this.getDataValue(`TopTimeIndex${i}`),
          Driven: this.getDataValue(`TopDriven${i}`),
        };
      });
    },
  },
};

// array of non virtual column names
const cols = _.toPairs(ddl)
  .filter(arr => arr[1].type !== Seq.VIRTUAL)
  .map(arr => arr[0]);

class LevelStats extends Model {
  // map an array of ids to existing instances or null
  // returns an object, indexed by ID.
  static mapIds = async levelIds => {
    const records = await LevelStats.findAll({
      where: {
        LevelIndex: levelIds,
      },
    });

    return Ps.mapIdsToRecordsOrNull(levelIds, records, 'LevelIndex');
  };

  // useful for using .bulkCreate() to upsert
  static getUpdateOnDuplicateKeys = () => {
    return cols.filter(
      key => !_.includes(['LevelStatsIndex', 'LevelIndex'], key),
    );
  };

  // converts time table records to an array of updates that need to be made
  // to the levelStats table. Times are an array of plain old javascript objects
  // and most likely do not share the same level (they might be all the times
  // driven since the last bulk update)
  static buildUpdatesFromTimes = async (times, lastPossibleTimeIndex) => {
    const timesByLevel = _.groupBy(times, 'LevelIndex');

    const track = getPerfTracker('');

    // ids mapped to LevelStats objects, or null
    const exLevelStats = await LevelStats.mapIds(Object.keys(timesByLevel));

    track('queryLevelStats');

    const updates = [];
    const trackers = [track(null)];

    _.forEach(timesByLevel, (levelTimes, LevelIndex) => {
      const prev = exLevelStats[LevelIndex];

      const [update, perfTracker] = LevelStats.buildUpdate(levelTimes, prev);

      update.LastPossibleTimeIndex = +lastPossibleTimeIndex;

      updates.push({ ...update, LevelIndex });
      trackers.push(perfTracker);
    });

    const aggregatePerf = aggregateTrackers(trackers);

    return [updates, exLevelStats, aggregatePerf];
  };

  /**
   * @param {Array<Object>} times
   * @param {LevelStats|null} prev
   * @returns {Object} - columns, ready for database update
   */
  static buildUpdate = (times, prev) => {
    const track = getPerfTracker('buildUpdate');

    assert(prev === null || _.isObjectLike(prev), `bad type: ${typeof prev}`);

    const aggs = Ps.aggregateTimes(times, prev);

    track('aggregateTimes');

    let update = Ps.buildCommonUpdate(aggs, prev);

    track('commonUpdate');

    // necessary for upsert later on
    if (prev !== null) {
      update.LevelStatsIndex = prev.LevelStatsIndex;
    }

    // array ready to be serialized
    const LeaderHistory = Ps.mergeLeaderHistory(times, prev);

    track('leaderHistory');

    // an array of objects.
    const newTopTimes = Ps.mergeTopTimes(times, prev, countTopXTimes);

    track('topTimes');

    // object with 5 entries
    const battleWinnerColumns = Ps.mergeBattleWinner(times, prev);

    track('battleWinner');

    // merge cols
    update = Object.assign(update, {
      LevelIndex: prev !== null ? prev.LevelIndex : aggs.LevelIndex,
      LeaderHistory,
      LeaderCount: LeaderHistory.length,
      UniqueLeaderCount: _.uniqBy(LeaderHistory, 'TimeIndex').length,
      ...battleWinnerColumns,
    });

    // add already calculated top times to update
    _.range(0, countTopXTimes).forEach(i => {
      if (newTopTimes[i] && newTopTimes[i].TimeIndex) {
        update[`TopKuskiIndex${i}`] = newTopTimes[i].KuskiIndex;
        update[`TopTime${i}`] = newTopTimes[i].Time;
        update[`TopTimeIndex${i}`] = newTopTimes[i].TimeIndex;
        update[`TopDriven${i}`] = newTopTimes[i].Driven;
      } else {
        update[`TopKuskiIndex${i}`] = null;
        update[`TopTime${i}`] = null;
        update[`TopTimeIndex${i}`] = null;
        update[`TopDriven${i}`] = null;
      }
    });

    track('Done');

    return [update, track(null)];
  };
}

LevelStats.init(ddl, {
  sequelize,
  tableName: 'levelStats_dev9',
  indexes: [
    { unique: true, fields: ['LevelIndex'] },
    { fields: ['LevelStatsIndex', 'LevelIndex'] },
  ],
});

export default LevelStats;
