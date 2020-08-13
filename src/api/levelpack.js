import express from 'express';
import { forEach } from 'lodash';
import { authContext } from 'utils/auth';
import { like, searchLimit, searchOffset } from 'utils/database';
import { Op } from 'sequelize';
import {
  Besttime,
  LevelPackLevel,
  Kuski,
  LevelPack,
  Level,
  Team,
  BestMultitime,
} from '../data/models';

const router = express.Router();

const getKuski = async k => {
  const findKuski = await Kuski.findOne({
    where: { Kuski: k },
  });
  return findKuski;
};

const getRecords = async LevelPackName => {
  const packInfo = await LevelPack.findOne({
    where: { LevelPackName },
  });
  const times = await LevelPackLevel.findAll({
    where: { LevelPackIndex: packInfo.LevelPackIndex },
    order: [['LevelPackLevelIndex', 'ASC']],
    include: [
      {
        model: Besttime,
        as: 'LevelBesttime',
        attributes: ['TimeIndex', 'Time', 'KuskiIndex'],
        order: [['Time', 'ASC'], ['TimeIndex', 'ASC']],
        limit: 1,
        include: [
          {
            model: Kuski,
            attributes: ['Kuski', 'Country'],
            as: 'KuskiData',
            include: [
              {
                model: Team,
                as: 'TeamData',
                attributes: ['Team'],
              },
            ],
          },
        ],
      },
      {
        model: Level,
        as: 'Level',
        attributes: ['LevelName', 'LongName', 'Hidden'],
      },
    ],
  });
  return times.filter(t => !t.Level.Hidden);
};

const getMultiRecords = async LevelPackName => {
  const packInfo = await LevelPack.findOne({
    where: { LevelPackName },
  });
  const times = await LevelPackLevel.findAll({
    where: { LevelPackIndex: packInfo.LevelPackIndex },
    order: [['LevelPackLevelIndex', 'ASC']],
    include: [
      {
        model: BestMultitime,
        as: 'LevelMultiBesttime',
        attributes: ['MultiTimeIndex', 'Time', 'KuskiIndex1', 'KuskiIndex2'],
        order: [['Time', 'ASC'], ['MultiTimeIndex', 'ASC']],
        limit: 1,
        include: [
          {
            model: Kuski,
            attributes: ['Kuski', 'Country'],
            as: 'Kuski1Data',
            include: [
              {
                model: Team,
                as: 'TeamData',
                attributes: ['Team'],
              },
            ],
          },
          {
            model: Kuski,
            attributes: ['Kuski', 'Country'],
            as: 'Kuski2Data',
            include: [
              {
                model: Team,
                as: 'TeamData',
                attributes: ['Team'],
              },
            ],
          },
        ],
      },
      {
        model: Level,
        as: 'Level',
        attributes: ['LevelName', 'LongName', 'Hidden'],
      },
    ],
  });
  return times.filter(t => !t.Level.Hidden);
};

const getPersonalTimes = async (LevelPackName, KuskiIndex) => {
  const packInfo = await LevelPack.findOne({
    where: { LevelPackName },
  });
  const times = await LevelPackLevel.findAll({
    where: { LevelPackIndex: packInfo.LevelPackIndex },
    order: [['LevelPackLevelIndex', 'ASC']],
    include: [
      {
        model: Besttime,
        as: 'LevelBesttime',
        attributes: ['TimeIndex', 'Time', 'KuskiIndex'],
        where: { KuskiIndex },
        include: [
          {
            model: Kuski,
            attributes: ['Kuski', 'Country'],
            as: 'KuskiData',
          },
        ],
      },
      {
        model: Level,
        as: 'Level',
        attributes: ['LevelName', 'LongName', 'Hidden'],
      },
    ],
  });
  return times.filter(t => !t.Level.Hidden);
};

const getTimes = async LevelPackIndex => {
  const times = await LevelPackLevel.findAll({
    where: { LevelPackIndex },
    attributes: ['LevelIndex'],
    include: [
      {
        model: Besttime,
        as: 'LevelBesttime',
        attributes: ['TimeIndex', 'Time', 'KuskiIndex'],
        include: [
          {
            model: Kuski,
            attributes: ['Kuski', 'Country'],
            as: 'KuskiData',
          },
        ],
      },
      {
        model: Level,
        as: 'Level',
        attributes: ['Hidden'],
      },
    ],
  });
  return times;
};

const getPacksByQuery = async query => {
  const packs = await LevelPack.findAll({
    where: {
      [Op.or]: [
        { LevelPackName: { [Op.like]: `${like(query)}%` } },
        { LevelPackLongName: { [Op.like]: `${like(query)}%` } },
      ],
    },
    include: [
      {
        model: Kuski,
        attributes: ['Kuski', 'Country'],
        as: 'KuskiData',
      },
    ],
  });
  const levels = await LevelPackLevel.findAll({
    attributes: ['LevelPackIndex', 'LevelIndex'],
    include: [
      {
        model: Level,
        as: 'Level',
        attributes: ['LevelName', 'LongName', 'LevelIndex'],
        where: { LevelName: { [Op.like]: `${like(query)}%` } },
      },
      {
        model: LevelPack,
        as: 'LevelPack',
        attributes: ['LevelPackName', 'LevelPackLongName'],
        include: [
          {
            model: Kuski,
            as: 'KuskiData',
            attributes: ['Kuski', 'Country'],
          },
        ],
      },
    ],
  });
  return [...packs, ...levels].filter(
    (v, i, a) => a.findIndex(x => x.LevelPackIndex === v.LevelPackIndex) === i,
  );
};

const getLevelsByQuery = async (query, offset) => {
  const levels = await Level.findAll({
    attributes: [
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
    ],
    offset: searchOffset(offset),
    where: {
      LevelName: {
        [Op.like]: `${like(query)}%`,
      },
      Locked: 0,
    },
    limit: searchLimit(offset),
    order: [['LevelName', 'ASC']],
  });
  return levels;
};

const totalTimes = times => {
  const tts = [];
  forEach(times, level => {
    if (!level.Level.Hidden) {
      forEach(level.LevelBesttime, time => {
        const findKuski = tts.findIndex(x => x.KuskiIndex === time.KuskiIndex);
        if (findKuski > -1) {
          tts[findKuski] = {
            ...tts[findKuski],
            tt: tts[findKuski].tt + time.Time,
            count: tts[findKuski].count + 1,
            TimeIndex:
              time.TimeIndex > tts[findKuski].TimeIndex
                ? time.TimeIndex
                : tts[findKuski].TimeIndex,
          };
        } else {
          tts.push({
            KuskiData: time.KuskiData,
            tt: time.Time,
            KuskiIndex: time.KuskiIndex,
            count: 1,
            TimeIndex: time.TimeIndex,
          });
        }
      });
    }
  });
  return tts.filter(x => x.count === times.length);
};

const pointList = [
  40,
  30,
  25,
  22,
  20,
  18,
  16,
  14,
  12,
  11,
  10,
  9,
  8,
  7,
  6,
  5,
  4,
  3,
  2,
  1,
];

const kinglist = times => {
  const points = [];
  forEach(times, level => {
    if (!level.Level.Hidden) {
      const sortedTimes = level.LevelBesttime.sort((a, b) => a.Time - b.Time);
      let no = 0;
      forEach(sortedTimes, data => {
        const time = data.dataValues;
        const findKuski = points.findIndex(
          x => x.KuskiIndex === time.KuskiIndex,
        );
        if (findKuski > -1) {
          points[findKuski] = {
            ...points[findKuski],
            points: points[findKuski].points + pointList[no],
            TimeIndex:
              time.TimeIndex > points[findKuski].TimeIndex
                ? time.TimeIndex
                : points[findKuski].TimeIndex,
          };
        } else {
          points.push({
            KuskiData: time.KuskiData,
            points: pointList[no],
            KuskiIndex: time.KuskiIndex,
            TimeIndex: time.TimeIndex,
          });
        }
        no += 1;
        if (no >= pointList.length) {
          return false;
        }
        return true;
      });
    }
  });
  return points;
};

const AddLevelPack = async data => {
  const NewPack = await LevelPack.create(data);
  return NewPack;
};

router
  .get('/:LevelPackIndex/totaltimes', async (req, res) => {
    const data = await getTimes(req.params.LevelPackIndex);
    const tts = totalTimes(data);
    const points = kinglist(data);
    res.json({ tts, points });
  })
  .get('/:LevelPackName/personal/:KuskiIndex', async (req, res) => {
    const getKuskiIndex = await getKuski(req.params.KuskiIndex);
    if (getKuskiIndex) {
      const data = await getPersonalTimes(
        req.params.LevelPackName,
        getKuskiIndex.dataValues.KuskiIndex,
      );
      res.json(data);
    } else {
      res.json({ error: 'Kuski does not exist' });
    }
  })
  .get('/:LevelPackName/records', async (req, res) => {
    const records = await getRecords(req.params.LevelPackName);
    res.json(records);
  })
  .get('/:LevelPackName/multirecords', async (req, res) => {
    const records = await getMultiRecords(req.params.LevelPackName);
    res.json(records);
  })
  .get('/search/:query', async (req, res) => {
    const packs = await getPacksByQuery(req.params.query);
    res.json(packs);
  })
  .get('/searchLevel/:query/:offset', async (req, res) => {
    const levs = await getLevelsByQuery(req.params.query, req.params.offset);
    res.json(levs);
  })
  .post('/add', async (req, res) => {
    const auth = authContext(req);
    if (auth.auth) {
      const add = await AddLevelPack({
        ...req.body,
        KuskiIndex: auth.userid,
      });
      res.json(add);
    } else {
      res.sendStatus(401);
    }
  });

export default router;
