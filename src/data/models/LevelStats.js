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
    allowNull: false,
    defaultValue: 0,
    foreignKey: true,
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
}

LevelStats.init(ddl, {
  sequelize: sequelizeInstance,
  tableName: 'levelStats_dev3',
  indexes: [{ fields: ['LevelStatsIndex', 'LevelIndex'] }],
});

export default LevelStats;
