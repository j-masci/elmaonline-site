import express from 'express';
import ReplayComment from './replay_comment';
import ReplayRating from './replay_rating';
import Replay from './replay';
import Country from './country';
import Register from './register';

const router = express.Router();

router
  .get('/', (req, res) => {
    res.json({ derp: 'derp' });
  })
  .use('/replay_comment', ReplayComment)
  .use('/replay_rating', ReplayRating)
  .use('/replay', Replay)
  .use('/country', Country)
  .use('/register', Register);

export default router;