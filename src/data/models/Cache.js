import Sequelize from 'sequelize';
// eslint-disable-next-line import/extensions
import sequelizeInstance from '../sequelize.js';

const ddl = {
  CacheIndex: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  // ie. "expensive_level_stats"
  Type: {
    type: Sequelize.STRING(255),
    defaultValue: '',
    allowNull: false,
    unique: 'type_key_index',
  },
  // ie. some ID
  Key: {
    type: Sequelize.STRING(255),
    defaultValue: '',
    allowNull: false,
    unique: 'type_key_index',
  },
  // ie. some JSON string
  Value: {
    type: Sequelize.TEXT('long'),
    allowNull: true,
  },
  // unix timestamp in seconds.
  // Note that not all cache entries need to have an expiry.
  ExpiresAt: {
    type: Sequelize.INTEGER,
    defaultValue: -1,
    allowNull: false,
  },
  // optional data (possibly JSON) that could be used to help determine the
  // validity of the Value column (at some point in the future).
  Context: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
};

class Cache extends Sequelize.Model {
  // cols is object containing Value, and optionally ExpiresAt and Context
  static async setByType(Type, Key, cols, duration = null) {
    const newCols = cols;
    newCols.Key = Key;
    newCols.Type = Type;

    if (duration > 0) {
      newCols.ExpiresAt = new Date().getTime() / 1000 + duration;
    }

    // eslint-disable-next-line no-return-await
    return await Cache.upsert(newCols);
  }

  static async getByType(Type, Key, checkExpired = true) {
    const ret = await Cache.findOne({
      where: {
        Type,
        Key,
      },
    });

    if (checkExpired) {
      if (
        ret &&
        ret.ExpiresAt !== -1 &&
        ret.ExpiresAt <= new Date().getTime() / 1000
      ) {
        return null;
      }
    }

    return ret || null;
  }

  static findExpired(time = undefined) {
    const t = time !== undefined ? time : new Date().getTime() / 1000;

    return Cache.findAll({
      where: {
        ExpiresAt: Sequelize.Op.and(Sequelize.Op.gt(0), Sequelize.Op.lte(t)),
      },
    });
  }

  // returns a function with the same signature as getter, but
  // the returned function will check and/or update the database cache based
  // on the output of the getter.
  static cachify(Type, getter, opts = {}) {
    const { getExpiresAt, getContext } = {
      ...opts,
      ...{
        // eslint-disable-next-line no-unused-vars
        getExpiresAt: (inputArr, output) => {
          if (opts.duration) {
            return new Date().getTime() / 1000 + opts.duration;
          }

          return -1;
        },
        // eslint-disable-next-line no-unused-vars
        getContext: (inputArr, output) => {
          return '';
        },
      },
    };

    const { getKey, parseCache, validateCache, buildCache } = {
      ...opts,
      ...{
        getKey: inputArr => inputArr[0] || '',
        parseCache: cache => cache && JSON.parse(cache.Value),
        validateCache: cache => cache && cache.CacheIndex && true,
        buildCache: (inputArr, output) => ({
          Value: JSON.stringify(output),
          ExpiresAt: getExpiresAt(inputArr, output),
          Context: getContext(inputArr, output),
        }),
      },
    };

    return async (...inputArr) => {
      const Key = getKey(inputArr);

      const cache = await Cache.getByType(Type, Key, true);

      if (cache && validateCache(cache)) {
        return parseCache(cache);
      }

      const output = await getter(...inputArr);

      await Cache.setByType(Type, Key, buildCache(inputArr, output));

      return output;
    };
  }
}

Cache.init(ddl, {
  sequelize: sequelizeInstance,
  tableName: 'Cache',
});

export default Cache;
