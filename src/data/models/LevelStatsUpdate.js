import Sequelize, { Model } from 'sequelize';
import * as Ps from './PlayStats';
import sequelizeInstance from '../sequelize';

export const ddl = {
  LevelStatsUpdateIndex: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  TimeIndex0: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  TimeIndex1: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  // unix timestamp
  TimeStart: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  // JSON encoded column. could store time taken, number of new/updated
  // records, etc.
  Debug: {
    type: Sequelize.TEXT,
    defaultValue: '',
    allowNull: false,
  },
};

class LevelStatsUpdate extends Model {
  // kind of like a getDebug function with accepts an optional
  // updater function which is run on the JSON decoded string value.
  withDebug = updater => {
    const val = this.getDataValue('Debug');

    let obj = val ? JSON.parse(val) : {};

    if (updater !== undefined) {
      obj = updater(obj);
    }

    return obj;
  };
}

LevelStatsUpdate.init(ddl, {
  sequelize: sequelizeInstance,
  tableName: 'levelStatsUpdate_dev2',
});

export default LevelStatsUpdate;
