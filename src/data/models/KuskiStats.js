import Sequelize, { Model } from 'sequelize';
import { getCommonCols, getCommonMergeStrategies } from './PlayStats';
import sequelizeInstance from '../sequelize';

export const ddl = {
  KuskiStatsIndex: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  KuskiIndex: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    foreignKey: true,
  },
  ...getCommonCols(),
};

class KuskiStats extends Model {
  getMergeStrategies = () => {
    return {
      // needed for insert but not update
      KuskiIndex: aggs => aggs.KuskiIndex,
      ...getCommonMergeStrategies(),
    };
  };
}

KuskiStats.init(ddl, {
  sequelize: sequelizeInstance,
  tableName: 'kuskiStats_dev1',
  indexes: [{ fields: ['KuskiStatsIndex', 'KuskiIndex'] }],
});

export default KuskiStats;
