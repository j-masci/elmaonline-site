import express from 'express';
import sequelize from 'sequelize';
import seq from 'data/sequelize';
import moment from 'moment';
import { authContext } from 'utils/auth';
import * as _ from 'lodash'; // { mapValues, has, includes, values, groupBy } from 'lodash';
import * as assert from 'assert';
import {
  Level,
  Time,
  Besttime,
  LevelStats,
  KuskiStats,
  PlayStats,
  LevelStatsUpdate,
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

  // eslint-disable-next-line no-underscore-dangle
  // const _times = await Time.findAll({
  //   where: {},
  //   order: [['TimeIndex', 'ASC']],
  //   limit: [0, 100],
  // });

  const [_times] = await seq.query(
    'select * from time order by TimeIndex ASC LIMIT 0, 1000000',
  );

  // r.fuck = _.map(_times, t => ({
  //   fuck: t.Driven,
  //   shit: moment(t.Driven).format('X'),
  //   ass: parseInt(moment(t.Driven).format('X'), 10),
  //   ass2: +moment(t.Driven).format('X'),
  // }));

  // eslint-disable-next-line no-unused-vars
  const [timesFiltered, firstIndex, lastIndex] = PlayStats.filterTimes(_times);

  const timesByLevel = _.groupBy(timesFiltered, 'LevelIndex');

  const levelIds = Object.keys(timesByLevel);

  // level indexes mapped to aggregate objects
  const aggregatesByLevel = _.mapValues(timesByLevel, times => {
    return PlayStats.aggregateTimes(times);
  });

  // ids mapped to LevelStats objects, or null
  const levelStatsRecords = await LevelStats.mapIds(levelIds);

  r.count = _.values(levelStatsRecords).length;
  r.countEx = _.values(levelStatsRecords).filter(s => s !== null).length;
  r.countNotEx = _.values(levelStatsRecords).filter(s => s === null).length;

  // stats can be null
  const updates = _.mapValues(levelStatsRecords, (levelStats, levelId) => {
    const thisLevelsAggregates = aggregatesByLevel[levelId];

    assert(thisLevelsAggregates !== undefined);

    return LevelStats.buildRecord(thisLevelsAggregates, levelStats || null);
  });

  const updateOnDuplicateKeys = LevelStats.getColumns().filter(
    key => !_.includes(['LevelStatsIndex', 'LevelIndex'], key),
  );

  r.dup = updateOnDuplicateKeys;
  // r.updates = updates;

  const updateResult = await LevelStats.bulkCreate(_.values(updates), {
    updateOnDuplicate: updateOnDuplicateKeys,
  });

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
