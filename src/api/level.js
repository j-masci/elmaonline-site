import express from 'express';
import sequelize from 'sequelize';
import seq from 'data/sequelize';
import { authContext } from 'utils/auth';
import { mapValues, has, values, groupBy } from 'lodash';
import * as assert from 'assert';
import {
  Level,
  Time,
  Besttime,
  LevelStats,
  KuskiStats,
  PlayStats,
} from '../data/models';

const router = express.Router();

const attributes = [
  'LevelIndex',
  'LevelName',
  'CRC',
  'LongName',
  'Apples',
  'Killers',
  'Flowers',
  'Locked',
  'SiteLock',
  'Hidden',
  'Legacy',
];

router.get('/temp', async (req, res) => {
  const r = {};

  const [levs] = await seq.query(
    'SELECT * FROM time WHERE FINISHED IN ("F", "E", "D") ORDER BY TimeIndex DESC LIMIT 0, 100000',
  );

  const levelsTimes = groupBy(levs, 'LevelIndex');

  // level indexes mapped to aggregate objects
  const aggregates = mapValues(levelsTimes, (times, levelIndex) => {
    return PlayStats.aggregateTimes(times);
  });

  // all level indexes mapped to existing LevelStats objects or null
  const exLevelStats = mapValues(aggregates, null);

  const [ex, nonExIds] = await LevelStats.findFromLevelIndexes(
    Object.keys(exLevelStats),
  );

  r.countLevs = Object.keys(aggregates).length;
  r.nonExIdsCount = nonExIds.length;
  r.exCount = ex.length;
  r.IDs = Object.keys(aggregates);
  r.nonExIds = nonExIds;
  r.ex = ex;

  // const toInsert = exLevelStats;
  // const toUpdate = {};
  r.aggs = aggregates;

  const strategies = LevelStats.getMergeStrategies();

  const updates = ex.map(stats => {
    const thisLevelsAggregates = aggregates[stats.LevelIndex];

    assert(thisLevelsAggregates !== undefined);

    const ret = PlayStats.addAggregates(
      thisLevelsAggregates,
      stats,
      strategies,
    );
    // ensure insert triggers updateOnDuplicate
    ret.LevelStatsIndex = stats.LevelStatsIndex;
    return ret;
  });

  const inserts = nonExIds.map(id => {
    const thisLevelsAggregates = aggregates[id];

    assert(thisLevelsAggregates !== undefined);

    return PlayStats.addAggregates(thisLevelsAggregates, {}, strategies);
  });

  console.log(42, updates.length);
  console.log(43, inserts.length);

  r.updates = updates;
  r.inserts = inserts;

  const updateOnDuplicateKeys = Object.keys(strategies).filter(
    key => ['LevelStatsIndex', 'LevelIndex'].indexOf(key) === -1,
  );

  r.updateOnDuplicateKeys = updateOnDuplicateKeys;

  console.log('UPDATE');

  const updateResult = await LevelStats.bulkCreate(updates, {
    updateOnDuplicate: updateOnDuplicateKeys,
  });

  console.log('INSERT');

  const insertResult = await LevelStats.bulkCreate(inserts, {});

  res.json(r);
});

const getLevel = async LevelIndex => {
  const level = await Level.findOne({
    attributes,
    where: { LevelIndex },
  });
  return level;
};

const getLevelData = async LevelIndex => {
  const level = await Level.findOne({
    attributes: ['LevelData', 'LevelIndex'],
    where: { LevelIndex },
  });
  return level;
};

const getLevelStatsForPlayer = async (LevelIndex, KuskiIndex) => {
  const stats = await Time.findAll({
    group: ['Finished'],
    attributes: [
      'Finished',
      [sequelize.fn('COUNT', 'Finished'), 'RunCount'],
      [sequelize.fn('SUM', sequelize.col('Time')), 'TimeSum'],
    ],
    where: { LevelIndex, KuskiIndex },
  });

  return stats;
};

const UpdateLevel = async (LevelIndex, update) => {
  const updateLevel = await Level.update(update, { where: { LevelIndex } });
  return updateLevel;
};

router.get('/:LevelIndex', async (req, res) => {
  const data = await getLevel(req.params.LevelIndex);
  res.json(data);
});

router.post('/:LevelIndex', async (req, res) => {
  const auth = authContext(req);
  if (auth.mod) {
    let update = { success: 0 };
    if (has(req.body, 'Locked')) {
      update = await UpdateLevel(req.params.LevelIndex, {
        Locked: parseInt(req.body.Locked, 10),
      });
    }
    if (has(req.body, 'Hidden')) {
      update = await UpdateLevel(req.params.LevelIndex, {
        Hidden: parseInt(req.body.Hidden, 10),
      });
    }
    res.json(update);
  } else {
    res.sendStatus(401);
  }
});

router.get('/leveldata/:LevelIndex', async (req, res) => {
  const data = await getLevelData(req.params.LevelIndex);
  res.json(data);
});

router.get('/timestats/:LevelIndex', async (req, res) => {
  const auth = authContext(req);
  let KuskiIndex = 0;
  if (auth.auth) {
    KuskiIndex = auth.userid;
  }

  const data = await getLevelStatsForPlayer(req.params.LevelIndex, KuskiIndex);
  res.json(data);
});

export default router;
