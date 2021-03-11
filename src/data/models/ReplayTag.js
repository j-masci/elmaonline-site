import DataType from 'sequelize';
import Model from '../sequelize';

const ReplayTag = Model.define('replay_tag', {
  ReplayTagIndex: {
    type: DataType.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  Name: {
    type: DataType.STRING(255),
    defaultValue: '',
    allowNull: false,
  },
  Description: {
    type: DataType.STRING(65535),
    defaultValue: null,
    allowNull: true,
  },
  Special: {
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
});

export default ReplayTag;
