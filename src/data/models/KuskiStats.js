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
    allowNull: true,
  },
  ...getCommonCols(),
};

class KuskiStats extends Model {
  static getMergeStrategies = () => {
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
  indexes: [
    { unique: true, fields: ['KuskiIndex'] },
    { fields: ['KuskiStatsIndex', 'KuskiIndex'] },
  ],
});

export default KuskiStats;
