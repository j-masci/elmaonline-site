import DataType from 'sequelize';
import Model from '../sequelize';

const ReplaysTags = Model.define('replays_tags', {
  ReplaysTagsIndex: {
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  ReplayIndex: {
    type: DataType.INTEGER,
    allowNull: false,
  },
  ReplayTagIndex: {
    type: DataType.INTEGER,
    allowNull: true,
  },
});

export default ReplaysTags;
