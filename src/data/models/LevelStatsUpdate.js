import Seq, { Model } from 'sequelize';
import sequelize from 'data/sequelize';
import { JsonUpdate, getCol } from '../../utils/sequelize';

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
  },
};

class LevelStatsUpdate extends Model {
  // ie. this.updateDebug(prev => { prev.newValue = 23 }, save = true)
  updateDebug = (callable, save) => {
    return JsonUpdate(this, 'Debug', callable, save);
  };

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
