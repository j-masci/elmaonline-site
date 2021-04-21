import Seq, { Model } from 'sequelize';
import * as _ from 'lodash';
import { strict as assert } from 'assert';
import * as Ps from './PlayStats';
import sequelize from '../sequelize';
import { getTopFinishes } from './PlayStats';

// store this many top times.
const topXTimes = 10;

// an array of arrays.
// if you slice and flatten, you'll get a one dimensional array of
// specified length. (eg. usage: query level stats with only top 3 times)
export const topXTimesColumns = _.range(0, topXTimes).map(i => {
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
  // ie. '2020-06-25 19:05:59',
  LastDriven: {
    type: Seq.STRING(19),
    allowNull: true,
  },
  // BattleTopTime: timeCol(),
  // BattleTopKuski: timeCol(),

  // ie. TopKuskiIndex0, TopTime0 ... TopTimeIndex9, TopDriven9
  // 40 columns
  ..._.flatten(
    _.range(0, topXTimes).map(x => ({
      [`TopKuskiIndex${x}`]: {
        type: Seq.INTEGER,
        allowNull: true,
      },
      [`TopTime${x}`]: {
        type: Seq.INTEGER,
        allowNull: true,
      },
      [`TopTimeIndex${x}`]: {
        type: Seq.INTEGER,
        allowNull: true,
      },
      [`TopDriven${x}`]: {
        type: Seq.INTEGER,
        allowNull: true,
      },
    })),
  ),

  BattleTopTime: {},
  BattleTopKuskiIndex: {},

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
      return _.range(0, topXTimes).map(i => {
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

// Array<string>
const cols = Object.keys(_.filterBy(ddl, col => col.type !== Seq.VIRTUAL));

class LevelStats extends Model {
  /**
   * @param {Array<Object>} times
   * @param {LevelStats|null} prev
   * @returns {Object} - columns, ready for database update
   */
  static buildUpdate = (times, prev) => {
    assert(prev === null || _.isObjectLike(prev), `bad type: ${typeof ex}`);

    const aggs = Ps.aggregateTimes(times, prev);

    let update = Ps.buildCommonUpdate(aggs, prev);

    // necessary for upsert later on
    if (prev !== null) {
      update.LevelStatsIndex = prev.LevelStatsIndex;
    }

    update = Object.assign(update, {
      LevelIndex: prev !== null ? prev.LevelIndex : aggs.LevelIndex,
      LastDriven: (() => {
        if (prev !== null) {
          return aggs.LastDriven > prev.LastDriven
            ? aggs.LastDriven
            : prev.LastDriven;
        }

        return aggs.LastDriven;
      })(),
      LeadersCount: (() => {
        const p = prev || {};

        let currentBest = {
          Time: (p && p.TopTime0) || 9999999999,
          Driven: (p && p.TopDriven0) || 0,
        };

        let count = 0;

        times.forEach(t => {
          let best = false;

          if (t.Finished === 'F') {
            if (t.Time < currentBest.Time) {
              best = true;
            } else if (
              t.Time === currentBest.Time &&
              t.Driven < currentBest.Driven
            ) {
              // this can occur when time are imported to time table with a
              // driven date some time in the past.
              best = true;
            }
          }

          if (best) {
            count += 1;

            currentBest = {
              Time: t.Time,
              Driven: t.Driven,
            };
          }

          const prevCount = p ? p.LeadersCount : 0;
          return count + prevCount;
        });
      })(),
    });

    const prevTopTimes = prev !== null ? prev.TopXTimes : [];

    const newTopTimes = Ps.getTopTimes(
      prevTopTimes.concat(Ps.getTopFinishes(times, topXTimes)),
      topXTimes,
    );

    // Top X times
    _.range(0, topXTimes).forEach(i => {
      if (newTopTimes[i].TimeIndex) {
        update[`TopKuskiIndex${i}`] = newTopTimes[i].KuskiIndex;
        update[`TopTime${i}`] = newTopTimes[i].TopTime;
        update[`TopTimeIndex${i}`] = newTopTimes[i].TopTimeIndex;
        update[`TopDriven${i}`] = newTopTimes[i].TopDriven;
      } else {
        update[`TopKuskiIndex${i}`] = null;
        update[`TopTime${i}`] = null;
        update[`TopTimeIndex${i}`] = null;
        update[`TopDriven${i}`] = null;
      }
    });

    return update;
  };

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

    // ids mapped to LevelStats objects, or null
    const exLevelStats = await LevelStats.mapIds(Object.keys(timesByLevel));

    const updates = _.values(
      _.mapValues(timesByLevel, (levelTimes, LevelIndex) => {
        const prev = exLevelStats[LevelIndex];

        return {
          ...LevelStats.buildUpdate(levelTimes, prev),
          LastPossibleTimeIndex: +lastPossibleTimeIndex,
        };
      }),
    );

    return [updates, exLevelStats];
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
