import express from 'express';
import sequelize from 'sequelize';
import seq from 'data/sequelize';
import { authContext } from 'utils/auth';
import { mapValues, has, values, groupBy } from 'lodash';
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
  const r = {
    updates: [],
  };

  const [levs] = await seq.query(
    'SELECT * FROM time WHERE FINISHED IN ("F", "E", "D") ORDER BY TimeIndex ASC LIMIT 0, 10000',
  );

  const levelsTimes = groupBy(levs, 'LevelIndex');

  const aggs = mapValues(levelsTimes, (times, levelIndex) => {
    return PlayStats.aggregateTimes(times);
  });

  r.countLevs = aggs.length;
  r.aggs = aggs;

  console.log('start');

  const strategies = LevelStats.getMergeStrategies();

  await Promise.all(
    values(aggs).map(async a => {
      const prev = await LevelStats.findOne({
        where: {
          LevelIndex: a.LevelIndex,
        },
      });

      const toUpdate = PlayStats.addAggregates(a, prev || {}, strategies);

      r.updates.push(toUpdate);

      if (prev) {
        // should be redundant
        delete toUpdate.LevelIndex;

        const updated = await prev.update(toUpdate);
        console.log('updated', updated ? 1 : 0);
      } else {
        const inserted = await LevelStats.create(toUpdate);
        console.log('inserted', inserted ? 1 : 0);
      }
    }),
  );

  console.log('done');

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
