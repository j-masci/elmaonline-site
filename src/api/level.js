import express from 'express';
import sequelize from 'sequelize';
import seq from 'data/sequelize';
import { authContext } from 'utils/auth';
import { has, values, groupBy } from 'lodash';
import { aggregate } from '../data/models/LevelStats';

import { Level, Time, Besttime, LevelStats } from '../data/models';

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

const recent = async count => {
  const [levs] = await seq.query(
    'SELECT * FROM time ORDER BY TimeIndex DESC LIMIT 0, ?',
    {
      replacements: [count],
    },
  );

  const indexes = values(groupBy(levs, l => l.LevelIndex))
    .map(lvs => lvs[0])
    .map(lev => lev.LevelIndex);

  return indexes;
};

router.get('/temp', async (req, res) => {
  const r = {};

  const LevelIndex = 5;

  const times = await Time.findAll({
    where: {
      LevelIndex,
      Finished: ['E', 'D', 'F'],
    },
    order: ['time', 'asc'],
    // limit: 100,
  });

  r.agg = aggregate(times);
  r.LevelIndex = LevelIndex;
  r.count = times.length;

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
