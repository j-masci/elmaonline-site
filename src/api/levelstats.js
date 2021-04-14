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

  const [times, coverage, moreTimesExist] = await Ps.getTimesInInterval(
    TimeIndex0,
    limit,
    true,
    true,
  );

  track('get_times');

  let transaction;

  try {
    // get transaction
    transaction = await sequelize.transaction();

    const [
      updates,
      levelStats,
      buildUpdatesPerf,
    ] = await LevelStats.buildUpdatesFromTimes(times, coverage[1]);

    track('build_updates');

    await LevelStats.bulkCreate(updates, {
      transaction,
      updateOnDuplicate: LevelStats.getUpdateOnDuplicateKeys(),
    });

    track('bulk_upsert');

    const levelStatsUpdate = await LevelStatsUpdate.create({
      TimeIndex0: coverage[0], // same as TimeIndex0
      TimeIndex1: coverage[1],
      TimeStart: moment().unix(),
      Debug: JSON.stringify({
        moreTimesExist,
        maxPossibleCountTimes: limit,
        actualCountTimes: times.length,
        countLevels: Object.keys(levelStats).length,
        countExLevels: _.values(levelStats).filter(l => l !== null).length,
        countNotExLevels: _.values(levelStats).filter(l => l === null).length,
        buildUpdatesPerf,
        // useful? Idk
        // levelIds: Object.keys(levelStats).map(k => +k),
      }),
    });

    // commit
    await transaction.commit();

    track('after_commit');

    // add performance tracker (after commit)
    await levelStatsUpdate.updateDebug(prevValue => {
      // eslint-disable-next-line no-param-reassign
      prevValue.perf = track(null);
    }, true);

    return levelStatsUpdate;
  } catch (err) {
    // catch exceptions thrown after the commit. If we commit and rollback,
    // we'll get a "Transaction cannot be rolled back because it has
    // been finished with state: commit" error. So catch and ignore
    // that, and then throw the original exception that caused it.
    try {
      await transaction.rollback();
    } catch (err2) {
      throw err;
    }

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
