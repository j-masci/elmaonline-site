import express from 'express';
import { forEach } from 'lodash';
import { authContext } from 'utils/auth';
import { eachSeries } from 'neo-async';
import { like, searchLimit, searchOffset } from 'utils/database';
import { Op } from 'sequelize';
import { firstEntry, lastEntry, inBetween } from 'utils/sort';
import {
  Besttime,
  LevelPackLevel,
  Kuski,
  LevelPack,
  Level,
  Team,
  BestMultitime,
  LegacyBesttime,
  Battle,
} from '../data/models';

const router = express.Router();

const getKuski = async k => {
  const findKuski = await Kuski.findOne({
    where: { Kuski: k },
  });
  return findKuski;
};

const getRecords = async (LevelPackName, eol = 0) => {
  const packInfo = await LevelPack.findOne({
    attributes: ['LevelPackIndex', 'Legacy'],
    where: { LevelPackName },
  });
  let timeTable = Besttime;
  let timeTableAlias = 'LevelBesttime';
  const attributes = ['TimeIndex', 'Time', 'KuskiIndex'];
  if (packInfo.Legacy && !eol) {
    timeTable = LegacyBesttime;
    timeTableAlias = 'LevelLegacyBesttime';
    attributes.push('Source');
  }
  const times = await LevelPackLevel.findAll({
    where: { LevelPackIndex: packInfo.LevelPackIndex },
    order: [
      ['Sort', 'ASC'],
      ['LevelPackLevelIndex', 'ASC'],
    ],
    include: [
      {
        model: timeTable,
        as: timeTableAlias,
        attributes,
        order: [
          ['Time', 'ASC'],
          ['TimeIndex', 'ASC'],
        ],
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
  if (packInfo.Legacy && !eol) {
    return times
      .filter(t => !t.Level.Hidden)
      .map(t => {
        return {
          ...t.dataValues,
          LevelBesttime: t.dataValues.LevelLegacyBesttime,
        };
      });
  }
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
        order: [
          ['Time', 'ASC'],
          ['MultiTimeIndex', 'ASC'],
        ],
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

const getPersonalTimes = async (LevelPackName, KuskiIndex, eolOnly = 0) => {
  const packInfo = await LevelPack.findOne({
    where: { LevelPackName },
  });
  let timeTable = Besttime;
  let timeTableAlias = 'LevelBesttime';
  const attributes = ['TimeIndex', 'Time', 'KuskiIndex'];
  if (packInfo.Legacy && !eolOnly) {
    timeTable = LegacyBesttime;
    timeTableAlias = 'LevelLegacyBesttime';
    attributes.push('Source');
  }
  const times = await LevelPackLevel.findAll({
    where: { LevelPackIndex: packInfo.LevelPackIndex },
    order: [['LevelPackLevelIndex', 'ASC']],
    include: [
      {
        model: timeTable,
        as: timeTableAlias,
        attributes,
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
  if (packInfo.Legacy && !eolOnly) {
    return times
      .filter(t => !t.Level.Hidden)
      .map(t => {
        return {
          ...t.dataValues,
          LevelBesttime: t.dataValues.LevelLegacyBesttime,
        };
      });
  }
  return times.filter(t => !t.Level.Hidden);
};

const getPersonalWithMulti = async (LevelPackName, KuskiIndex, eolOnly = 0) => {
  const packInfo = await LevelPack.findOne({
    where: { LevelPackName },
  });
  let timeTable = Besttime;
  // let timeTableAlias = 'LevelBesttime';
  const attributes = ['TimeIndex', 'Time', 'KuskiIndex', 'LevelIndex'];
  if (packInfo.Legacy && !eolOnly) {
    timeTable = LegacyBesttime;
    // timeTableAlias = 'LevelLegacyBesttime';
    attributes.push('Source');
  }

  const packLevels = await LevelPackLevel.findAll({
    where: {
      LevelPackIndex: packInfo.dataValues.LevelPackIndex,
    },
    order: [
      ['Sort', 'ASC'],
      ['LevelPackLevelIndex', 'ASC'],
    ],
  }).then(data => data.map(r => r.LevelIndex));

  const multiTimesByLevel = [];
  // eslint-disable-next-line
  const allMultiTimes = await BestMultitime.findAll({
    where: {
      [Op.and]: [
        {
          [Op.or]: {
            KuskiIndex1: KuskiIndex,
            KuskiIndex2: KuskiIndex,
          },
        },
        {
          LevelIndex: {
            [Op.in]: packLevels,
          },
        },
      ],
    },
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
  }).then(data => {
    packLevels.forEach(levIndex => {
      const levelTimes = [...data].filter(r => {
        return levIndex === r.LevelIndex;
      });
      if (levelTimes.length > 0)
        multiTimesByLevel.push(levelTimes.sort((a, b) => a.Time - b.Time)[0]);
    });
  });
  const singleTimesByLevel = await timeTable.findAll({
    attributes,
    where: {
      [Op.and]: {
        KuskiIndex,
        LevelIndex: {
          [Op.in]: packLevels,
        },
      },
    },
    include: [
      {
        model: Level,
        as: 'LevelData',
        attributes: ['LevelName', 'LongName', 'Hidden'],
      },
    ],
  });
  if (packInfo.Legacy && !eolOnly) {
    singleTimesByLevel
      .filter(t => !t.LevelData.Hidden)
      .map(t => {
        return {
          ...t.dataValues,
          LevelBesttime: t.dataValues.LevelLegacyBesttime,
        };
      });
  }
  const timesData = packLevels.map(i => {
    const singleTime = singleTimesByLevel.filter(r => i === r.LevelIndex)[0];
    const multiTime = multiTimesByLevel.filter(r => i === r.LevelIndex)[0];
    if (!singleTime && !multiTime) {
      return {
        LevelBesttime: {},
        LevelMultiBesttime: {},
        LevelCombinedBesttime: {},
      };
    }

    let OtherKuski;

    if (multiTime) {
      OtherKuski =
        multiTime.KuskiIndex1 === KuskiIndex
          ? multiTime.Kuski2Data
          : multiTime.Kuski1Data;
      if (multiTime.KuskiIndex1 === multiTime.KuskiIndex2) OtherKuski = 'solo';
    }

    let LevelMultiBesttime;

    if (multiTime) {
      LevelMultiBesttime = {
        Kuski: KuskiIndex,
        OtherKuski,
        Time: multiTime.Time,
        MultiTimeIndex: multiTime.MultiTimeIndex,
      };
    }

    if (!singleTime) {
      return {
        LevelBesttime: {},
        LevelMultiBesttime,
        LevelCombinedBesttime: LevelMultiBesttime,
      };
    }

    const LevelBesttime = {
      Kuski: KuskiIndex,
      Time: singleTime.Time,
      OtherKuski: 'single',
      TimeIndex: singleTime.TimeIndex,
      Source: attributes.indexOf('Source') !== -1 ? singleTime.Source : null,
    };

    if (!multiTime) {
      return {
        LevelBesttime,
        LevelMultiBesttime: {},
        LevelCombinedBesttime: LevelBesttime,
      };
    }

    const LevelCombinedBesttime = {
      Kuski: KuskiIndex,
      OtherKuski,
      Time:
        multiTime.Time <= singleTime.Time ? multiTime.Time : singleTime.Time,
    };
    return { LevelBesttime, LevelMultiBesttime, LevelCombinedBesttime };
  });

  return {
    packInfo,
    packLevels,
    timesData,
    allMultiTimes,
    KuskiIndex,
  };
};

const getTimes = async (LevelPackIndex, eolOnly = 0) => {
  const packInfo = await LevelPack.findOne({
    where: { LevelPackIndex },
  });
  let timeTable = Besttime;
  let timeTableAlias = 'LevelBesttime';
  if (packInfo.Legacy && !eolOnly) {
    timeTable = LegacyBesttime;
    timeTableAlias = 'LevelLegacyBesttime';
  }
  const times = await LevelPackLevel.findAll({
    where: { LevelPackIndex },
    attributes: ['LevelIndex'],
    include: [
      {
        model: timeTable,
        as: timeTableAlias,
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
  if (packInfo.Legacy && !eolOnly) {
    return times.map(t => {
      return {
        ...t.dataValues,
        LevelBesttime: t.dataValues.LevelLegacyBesttime,
      };
    });
  }
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

  const matchingLevels = await Level.findAll({
    attributes: ['LevelName', 'LevelIndex'],
    where: { LevelName: { [Op.like]: `${like(query)}%` } },
  });

  const levels = await LevelPackLevel.findAll({
    attributes: ['LevelPackIndex', 'LevelIndex'],
    where: {
      LevelIndex: { [Op.in]: matchingLevels.map(lev => lev.LevelIndex) },
    },
    include: [
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

const getLevelsByQuery = async (query, offset, showLocked, isMod) => {
  let show = false;
  const q = {
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
      'Added',
      'AddedBy',
    ],
    offset: searchOffset(offset),
    where: {
      LevelName: {
        [Op.like]: `${like(query)}%`,
      },
    },
    limit: searchLimit(offset),
    order: [
      ['LevelName', 'ASC'],
      ['LevelIndex', 'ASC'],
    ],
    include: [
      { model: Kuski, as: 'KuskiData', attributes: ['Kuski'] },
      { model: Battle, as: 'Battles', attributes: ['BattleIndex', 'Aborted'] },
    ],
  };
  if (!isMod || (isMod && !parseInt(showLocked, 10))) {
    q.where.Locked = 0;
  } else {
    show = true;
  }
  const levels = await Level.findAll(q);
  return { levels, showLocked: show };
};

const getLevelsByQueryAll = async (query, ShowLocked) => {
  const q = {
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
    where: {
      LevelName: {
        [Op.like]: `${like(query)}%`,
      },
    },
    limit: 100,
    order: [
      ['LevelName', 'ASC'],
      ['LevelIndex', 'ASC'],
    ],
  };
  if (parseInt(ShowLocked, 10) === 0) {
    q.where.Locked = 0;
  }
  const levels = await Level.findAll(q);
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

const DeleteLevel = async data => {
  const pack = await LevelPack.findOne({
    where: { LevelPackIndex: data.LevelPackIndex },
  });
  if (pack.KuskiIndex === data.KuskiIndex || data.mod) {
    await LevelPackLevel.destroy({
      where: {
        LevelIndex: data.LevelIndex,
        LevelPackIndex: data.LevelPackIndex,
      },
    });
    return true;
  }
  return false;
};

const AddLevel = async data => {
  const pack = await LevelPack.findOne({
    where: { LevelPackIndex: data.LevelPackIndex },
  });
  const level = await Level.findOne({
    where: { LevelIndex: data.LevelIndex },
  });
  if (level.Locked) {
    return 'Level is locked.';
  }
  if (pack.KuskiIndex === data.KuskiIndex || data.mod) {
    let Sort = '';
    if (data.levels > 0) {
      Sort = lastEntry(data.last.Sort);
    } else {
      Sort = firstEntry();
    }
    await LevelPackLevel.create({
      LevelPackIndex: data.LevelPackIndex,
      LevelIndex: data.LevelIndex,
      Sort,
    });
    return '';
  }
  return 'This is not your level pack';
};

const SortLevel = async data => {
  const pack = await LevelPack.findOne({
    where: { LevelPackIndex: data.LevelPackIndex },
  });
  if (pack.KuskiIndex === data.KuskiIndex || data.mod) {
    const { LevelIndex } = data.levels[data.source.index];
    const beforeIndex =
      data.destination.index === 0
        ? data.destination.index
        : data.destination.index - 1;
    const midIndex = data.destination.index;
    const afterIndex =
      data.destination.index === data.levels.length - 1
        ? data.destination.index
        : data.destination.index + 1;
    let Sort = '';
    if (data.source.index > data.destination.index) {
      Sort = inBetween(
        data.levels[beforeIndex].Sort,
        data.levels[midIndex].Sort,
        -1,
      );
    } else {
      Sort = inBetween(
        data.levels[midIndex].Sort,
        data.levels[afterIndex].Sort,
        1,
      );
    }
    await LevelPackLevel.update(
      { Sort },
      {
        where: { LevelPackIndex: data.LevelPackIndex, LevelIndex },
      },
    );
    return true;
  }
  return false;
};

const SortPackUpdate = async (data, done) => {
  await LevelPackLevel.update(
    { Sort: data.Sort },
    { where: { LevelPackLevelIndex: data.LevelPackLevelIndex } },
  );
  done();
};

const SortPack = async data => {
  const pack = await LevelPack.findOne({
    where: { LevelPackIndex: data.LevelPackIndex },
  });
  if (pack.KuskiIndex === data.KuskiIndex || data.mod) {
    const updateBulk = [];
    let Sort = '';
    forEach(data.levels, l => {
      if (!Sort) {
        Sort = firstEntry();
      } else {
        Sort = lastEntry(Sort);
      }
      updateBulk.push({ LevelPackLevelIndex: l.LevelPackLevelIndex, Sort });
    });
    await eachSeries(updateBulk, SortPackUpdate);
    return true;
  }
  return false;
};

const getPackByName = async LevelPackName => {
  const packInfo = await LevelPack.findOne({
    where: { LevelPackName },
    include: [{ model: Kuski, as: 'KuskiData', attributes: ['Kuski'] }],
  });
  return packInfo;
};

const allPacks = async () => {
  const data = await LevelPack.findAll({
    include: [{ model: Kuski, as: 'KuskiData', attributes: ['Kuski'] }],
    order: [['LevelPackName', 'ASC']],
  });
  return data;
};

router
  .get('/', async (req, res) => {
    const data = await allPacks();
    res.json(data);
  })
  .get('/:LevelPackIndex/totaltimes', async (req, res) => {
    const data = await getTimes(req.params.LevelPackIndex);
    const tts = totalTimes(data);
    const points = kinglist(data);
    res.json({ tts, points });
  })
  .get('/:LevelPackIndex/totaltimes/:eolOnly', async (req, res) => {
    const data = await getTimes(
      req.params.LevelPackIndex,
      parseInt(req.params.eolOnly, 10),
    );
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
  .get('/:LevelPackName/personal/:KuskiIndex/:eolOnly', async (req, res) => {
    const getKuskiIndex = await getKuski(req.params.KuskiIndex);
    if (getKuskiIndex) {
      const data = await getPersonalTimes(
        req.params.LevelPackName,
        getKuskiIndex.dataValues.KuskiIndex,
        parseInt(req.params.eolOnly, 10),
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
  .get('/:LevelPackName/records/:eolOnly', async (req, res) => {
    const records = await getRecords(
      req.params.LevelPackName,
      parseInt(req.params.eolOnly, 10),
    );
    res.json(records);
  })
  .get('/:LevelPackName/multirecords', async (req, res) => {
    const records = await getMultiRecords(req.params.LevelPackName);
    res.json(records);
  })
  .get(
    '/:LevelPackName/personalwithmulti/:KuskiIndex/:eolOnly',
    async (req, res) => {
      const getKuskiIndex = await getKuski(req.params.KuskiIndex);
      if (getKuskiIndex) {
        const times = await getPersonalWithMulti(
          req.params.LevelPackName,
          getKuskiIndex.dataValues.KuskiIndex,
          parseInt(req.params.eolOnly, 10),
        );
        res.json(times);
      } else {
        res.json({ error: 'Kuski does not exist' });
      }
    },
  )
  .get('/search/:query', async (req, res) => {
    const packs = await getPacksByQuery(req.params.query);
    res.json(packs);
  })
  .get('/searchLevel/:query/:ShowLocked', async (req, res) => {
    const auth = authContext(req);
    if (auth.auth) {
      const levs = await getLevelsByQueryAll(
        req.params.query,
        req.params.ShowLocked,
      );
      res.json(levs);
    } else {
      res.sendStatus(401);
    }
  })
  .get('/searchLevel/:query/:offset/:showLocked', async (req, res) => {
    const auth = authContext(req);
    const levs = await getLevelsByQuery(
      req.params.query,
      req.params.offset,
      req.params.showLocked,
      auth.mod,
    );
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
  })
  .post('/admin/deleteLevel', async (req, res) => {
    const auth = authContext(req);
    if (auth.auth) {
      const del = await DeleteLevel({
        ...req.body,
        KuskiIndex: auth.userid,
        mod: auth.mod,
      });
      if (del) {
        res.json({ success: 1 });
      } else {
        res.json({ success: 0, error: 'This is not your level pack' });
      }
    } else {
      res.sendStatus(401);
    }
  })
  .post('/admin/addLevel', async (req, res) => {
    const auth = authContext(req);
    if (auth.auth) {
      const add = await AddLevel({
        ...req.body,
        KuskiIndex: auth.userid,
        mod: auth.mod,
      });
      if (add) {
        res.json({ success: 0, error: add });
      } else {
        res.json({ success: 1 });
      }
    } else {
      res.sendStatus(401);
    }
  })
  .post('/admin/sortLevel', async (req, res) => {
    const auth = authContext(req);
    if (auth.auth) {
      const sort = await SortLevel({
        ...req.body,
        KuskiIndex: auth.userid,
        mod: auth.mod,
      });
      if (sort) {
        res.json({ success: 1 });
      } else {
        res.json({ success: 0, error: 'This is not your level pack' });
      }
    } else {
      res.sendStatus(401);
    }
  })
  .post('/admin/sort', async (req, res) => {
    const auth = authContext(req);
    if (auth.auth) {
      const sort = await SortPack({
        ...req.body,
        KuskiIndex: auth.userid,
        mod: auth.mod,
      });
      if (sort) {
        res.json({ success: 1 });
      } else {
        res.json({ success: 0, error: 'This is not your level pack' });
      }
    } else {
      res.sendStatus(401);
    }
  })
  .get('/:LevelPackName', async (req, res) => {
    const data = await getPackByName(req.params.LevelPackName);
    res.json(data);
  });

export default router;
