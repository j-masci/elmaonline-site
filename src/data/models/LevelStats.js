import Sequelize, { Model } from 'sequelize';
import { getCommonCols, getCommonMergeStrategies } from './PlayStats';
import sequelizeInstance from '../sequelize';

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
  ...getCommonCols(),
  // BattleTopTime: timeCol(),
  // BattleTopKuski: timeCol(),
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
};

class LevelStats extends Model {
  static getMergeStrategies = () => {
    return {
      LevelIndex: aggs => aggs.LevelIndex,
      ...getCommonMergeStrategies(),
    };
  };

  // returns an array of levelStats objects, and an array of level IDs for
  // which no levelStats entry exists.
  static findFromLevelIndexes = async indexes => {
    // eslint-disable-next-line no-param-reassign
    indexes = indexes.map(i => +i);

    const ex = await LevelStats.findAll({
      where: {
        LevelIndex: indexes,
      },
    });

    const exIds = ex.map(row => +row.LevelIndex);

    const nonExIds = indexes.filter(id => exIds.indexOf(+id) === -1);

    return [ex, nonExIds];
  };
}

LevelStats.init(ddl, {
  sequelize: sequelizeInstance,
  tableName: 'levelStats_dev5',
  indexes: [
    { unique: true, fields: ['LevelIndex'] },
    { fields: ['LevelStatsIndex', 'LevelIndex'] },
  ],
});

export default LevelStats;
