import Seq, { Model } from 'sequelize';
import sequelize from 'data/sequelize';
import * as _ from 'lodash';
import * as Ps from './PlayStats';
import { getJsonUpdater, getCol } from '../../utils/sequelize';

export const ddl = {
  LevelStatsUpdateIndex: {
    type: Seq.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  // time.TimeIndex
  TimeIndex0: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  // time.TimeIndex
  TimeIndex1: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  // unix timestamp
  TimeStart: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  // JSON
  Debug: {
    type: Seq.TEXT('long'),
    // not turning on because not tested and not needed atm.
    // probably works fine however.
    // get() {
    //   return JSON.parse(this.getDataValue('Debug'));
    // },
    // set(value) {
    //   this.setDataValue('Debug', JSON.stringify(value));
    // },
  },
};

class LevelStatsUpdate extends Model {
  // ie. this.updateDebug(prev => { prev.newValue = 23 }, save = true)
  updateDebug = getJsonUpdater('Debug');

  static getLastTimeIndexProcessed = async () =>
    getCol(
      'SELECT MAX(TimeIndex1) maxIndex from levelStatsUpdate_dev4',
      {},
      'maxIndex',
    );
}

LevelStatsUpdate.init(ddl, {
  sequelize,
  tableName: 'levelStatsUpdate_dev4',
});

export default LevelStatsUpdate;
