import React from 'react';
import PropTypes from 'prop-types';
import { graphql, compose } from 'react-apollo';
import withStyles from 'isomorphic-style-loader/lib/withStyles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Paper from '@material-ui/core/Paper';
import { sortResults } from 'utils';
import s from './Battle.css';
import battleQuery from './battle.graphql';
import Recplayer from '../../components/Recplayer';
import { BattleType } from '../../components/Names';
import Time from '../../components/Time';
import Link from '../../components/Link';
import Chat from '../../components/Chat';
import Kuski from '../../components/Kuski';
import LocalTime from '../../components/LocalTime';

class Battle extends React.Component {
  static propTypes = {
    BattleIndex: PropTypes.number.isRequired,
    data: PropTypes.shape({
      Loading: PropTypes.bool,
      getBattle: PropTypes.shape({
        LevelIndex: PropTypes.number,
      }),
    }).isRequired,
  };

  render() {
    const { BattleIndex } = this.props;
    const { data: { getBattle, getAllBattleTimes } } = this.props;
    const isWindow = typeof window !== 'undefined';

    if (!getBattle) return <div className={s.root}>Battle is unfinished</div>;

    return (
      <div className={s.root}>
        <div className={s.playerContainer}>
          <div className={s.player}>
            {isWindow && (
              <Recplayer
                rec={`/dl/battlereplay/${BattleIndex}`}
                lev={`/dl/level/${getBattle.LevelIndex}`}
                controls
              />
            )}
          </div>
        </div>
        <div className={s.rightBarContainer}>
          <div className={s.chatContainer}>
            <ExpansionPanel defaultExpanded>
              <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">Battle info</Typography>
              </ExpansionPanelSummary>
              <ExpansionPanelDetails>
                <div className={s.battleDescription}>
                  {getBattle.Duration} minute{' '}
                  <span className={s.battleType}>
                    <BattleType type={getBattle.BattleType} />
                  </span>{' '}
                  battle in {getBattle.LevelData.LevelName}.lev by{' '}
                  {getBattle.KuskiData.Kuski}
                  <div className={s.battleTimestamp}>
                    Started{' '}
                    <LocalTime
                      date={getBattle.Started}
                      format="DD.MM.YYYY HH:mm:ss"
                      parse="X"
                    />
                  </div>
                  <br />
                  <Link to={`/levels/${getBattle.LevelIndex}`}>
                    Go to level page
                  </Link>
                </div>
              </ExpansionPanelDetails>
            </ExpansionPanel>
            {getBattle.BattleType === 'NM' && (
              <ExpansionPanel defaultExpanded>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">Leader history</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <div className={s.timeDevelopment}>
                    {[...getAllBattleTimes]
                      .reduce((acc, cur) => {
                        if (
                          acc.length < 1 ||
                          acc[acc.length - 1].Time > cur.Time
                        )
                          acc.push(cur);
                        return acc;
                      }, [])
                      .map((b, i, a) => (
                        <div className={s.timeDevelopmentRow} key={b.TimeIndex}>
                          <span className={s.timeDiff}>
                            {a.length > 1 && !a[i + 1] && 'Winner'}
                            {a[i - 1] && (
                              <span>
                                {' '}
                                -<Time time={a[i - 1].Time - b.Time} />
                              </span>
                            )}
                            {a.length > 1 && !a[i - 1] && 'First finish'}
                            {a.length === 1 && 'Only finish'}
                          </span>
                          <span className={s.timelineCell}>
                            <span className={s.timelineMarker} />
                            <span className={s.timelineLine} />
                          </span>
                          <span className={s.timeDevelopmentTime}>
                            <Time time={b.Time} />
                          </span>
                          <span className={s.timeDevelopmentKuski}>
                            {b.KuskiData.Kuski}
                          </span>
                        </div>
                      ))}
                  </div>
                </ExpansionPanelDetails>
              </ExpansionPanel>
            )}
            <ExpansionPanel defaultExpanded>
              <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">Chat</Typography>
              </ExpansionPanelSummary>
              <ExpansionPanelDetails>
                <Chat
                  start={getBattle.Started}
                  end={
                    Number(getBattle.Started) + Number(getBattle.Duration * 60)
                  }
                />
              </ExpansionPanelDetails>
            </ExpansionPanel>
          </div>
        </div>
        <div className={s.levelStatsContainer}>
          <Paper>
            {getBattle.Results && (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell
                      style={{
                        width: 1,
                      }}
                    >
                      #
                    </TableCell>
                    <TableCell
                      style={{
                        width: 200,
                      }}
                    >
                      Kuski
                    </TableCell>
                    <TableCell>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...getBattle.Results]
                    .sort(sortResults(getBattle.BattleType))
                    .map((r, i) => (
                      <TableRow key={r.KuskiIndex}>
                        <TableCell>{i + 1}.</TableCell>
                        <TableCell>
                          <Kuski kuskiData={r.KuskiData} flag team />
                        </TableCell>
                        <TableCell>
                          <Time time={r.Time} apples={r.Apples} />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </div>
      </div>
    );
  }
}

export default compose(
  withStyles(s),
  graphql(battleQuery, {
    options: ownProps => ({
      variables: {
        BattleIndex: ownProps.BattleIndex,
      },
    }),
  }),
)(Battle);