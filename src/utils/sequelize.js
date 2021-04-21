import sequelize from 'data/sequelize';

const { query } = sequelize;

// get the first row of a select query, or a default value.
export const getOne = async (sql, opts, df = null) => {
  const [results] = query(sql, opts);

  return results.length > 0 ? results[0] : df;
};

// get a specified column in the first row of a query.
// if the query returns no rows or your column is not found,
// returns undefined. In some cases, undefined indicates an
// error on your part.
export const getCol = async (sql, opts, column) => {
  const first = getOne(sql, opts, null);

  return first ? first[column] : undefined;
};

// returns a function that updates a JSON column on your model and
// optionally calls save. The callable that you pass to it receives and
// returns an object. If your column has custom getters/setters defined
// in your model, those are bypassed.
export const getJsonUpdater = col => async (callable, save = true) => {
  // bypass get/set methods in model definition, if any
  const stringVal = this.dataValues[col];
  let value = stringVal ? JSON.parse(stringVal) : {};

  // the callable can return an object or mutate the object/array
  // directly and return nothing.
  const ret = callable(value);

  if (ret !== undefined) {
    value = ret;
  }

  this.dataValues[col] = JSON.stringify(value);

  if (save) {
    this.save();
  }
};
