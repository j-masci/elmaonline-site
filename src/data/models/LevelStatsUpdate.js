import Seq, { Model } from 'sequelize';
import * as _ from 'lodash';
import sequelize from 'data/sequelize';
import * as Ps from './PlayStats';

export const ddl = {
  LevelStatsUpdateIndex: {
    type: Seq.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  TimeIndex0: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  TimeIndex1: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  // unix timestamp
  TimeStart: {
    type: Seq.INTEGER,
    allowNull: true,
  },
  // JSON encoded column. could store time taken, number of new/updated
  // records, etc.
  Debug: {
    type: Seq.TEXT('long'),
  },
};

class LevelStatsUpdate extends Model {
  // gets the debug column json decoded, and optionally runs
  // a callback function on the it (for convenience)
  withDebug = updater => {
    const val = this.getDataValue('Debug');

    let obj = val ? JSON.parse(val) : {};

    if (updater !== undefined) {
      obj = updater(obj);
      this.setDataValue('Debug', JSON.stringify(obj));
    }

    return obj;
  };

  // a bit inefficient, but convenient
  updateAndSaveDebug = updater => {
    this.update({
      Debug: JSON.stringify(this.withDebug(updater)),
    });
  };

  static getLastTimeIndexProcessed = async () => {
    const [rows] = await sequelize.query(
      'SELECT MAX(TimeIndex1) last from levelStatsUpdate_dev4',
    );

    return rows.length ? +rows[0].last : 1;
  };
}

LevelStatsUpdate.init(ddl, {
  sequelize,
  tableName: 'levelStatsUpdate_dev4',
});

export default LevelStatsUpdate;
