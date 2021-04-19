import express from 'express';
import { authContext } from 'utils/auth';
import * as _ from 'lodash';
import moment from 'moment';
import assert from 'assert';
import { getPerfTracker } from 'utils/perf';
import Seq from 'sequelize';
import sequelize from 'data/sequelize';
import { LevelStats, LevelStatsUpdate } from '../data/models';
import * as Ps from '../data/models/PlayStats';

const router = express.Router();

// checks the current state of the database and processes the next X
// times, resulting in updates to levelStats and levelStatsUpdates.
const doNext = async limit => {
  const track = getPerfTracker();

  const last = await LevelStatsUpdate.getLastTimeIndexProcessed();

  const TimeIndex0 = last + 1;

  const [_times, coverage, moreTimesExist] = await Ps.getTimesInInterval(
    TimeIndex0,
    limit,
  );

  track('after_get_times');

  // Finished F, E, or D
  const times = _times.filter(Ps.timeFinishedAll);

  track('after_filter_times');

  let transaction;

  try {
    // get transaction
    transaction = await sequelize.transaction();

    const [updates, levelStats] = await LevelStats.processTimes(
      times,
      coverage[1],
    );

    track('after_process_times');

    await LevelStats.bulkCreate(updates, {
      transaction,
      updateOnDuplicate: LevelStats.getUpdateOnDuplicateKeys(),
    });

    track('after_update_levelStats');

    const levelStatsUpdate = await LevelStatsUpdate.create({
      TimeIndex0: coverage[0], // same as TimeIndex0
      TimeIndex1: coverage[1],
      TimeStart: moment().unix(),
      Debug: JSON.stringify({
        limit,
        moreTimesExist,
        count: Object.keys(levelStats).length,
        countEx: _.values(levelStats).filter(l => l !== null).length,
        countNotEx: _.values(levelStats).filter(l => l === null).length,
        // useful? Idk
        // levelIds: Object.keys(levelStats).map(k => +k),
      }),
    });

    // commit
    await transaction.commit();

    track('after_commit');

    await levelStatsUpdate.updateAndSaveDebug(d => {
      // eslint-disable-next-line no-param-reassign
      d.perf = track(null);
      return d;
    });

    return levelStatsUpdate;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

// todo: authorization
router.get('/do-next/:limit', async (req, res) => {
  const limit = +req.params.limit;

  if (limit < 1) {
    res.json({
      error: 'Count must be 1 or more.',
    });
    return;
  }

  const update = await doNext(limit);
  res.json(update);
});

export default router;
