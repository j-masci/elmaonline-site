import React from 'react';
import styled from 'styled-components';
import {
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@material-ui/core';
import { ExpandMore } from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';
import { BattleType } from 'components/Names';
import Link from 'components/Link';
import ChatView from 'components/ChatView';
import LocalTime from 'components/LocalTime';
import LeaderHistory from 'components/LeaderHistory';
import { battleStatus } from 'utils/battle';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: theme.spacing(1),
  },
  button: {
    fontWeight: 'inherit',
    textTransform: 'initial',
  },
}));

const RightBarContainer = props => {
  const { allBattleTimes, battle } = props;
  const classes = useStyles();

  if (!battle) return <Root>loading...</Root>;

  return (
    <Root>
      <div className="chatContainer">
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="body2">Battle info</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <BattleStyleDescription>
              {battle.Duration} minute{' '}
              <span className="battleType">
                <BattleType type={battle.BattleType} />
              </span>{' '}
              battle in{' '}
              <a href={`/dl/level/${battle.LevelIndex}`}>
                {battle.LevelData ? battle.LevelData.LevelName : '?'}
                .lev
              </a>{' '}
              {battle.KuskiData.Kuski}
              <div className="timeStamp">
                Started{' '}
                <LocalTime
                  date={battle.Started}
                  format="DD.MM.YYYY HH:mm:ss"
                  parse="X"
                />
              </div>
              <div className="timeStamp">
                <a href={`/dl/battlereplay/${battle.BattleIndex}`}>
                  Download replay
                </a>
              </div>
              <br />
              <Link to={`/levels/${battle.LevelIndex}`}>
                <Button size="small" color="primary" className={classes.button}>
                  Go to level page
                </Button>
              </Link>
              <RightLinkContainer>
                <Link
                  to={`/battles/${battle.BattleIndex - 1}`}
                  className={classes.margin}
                >
                  <Button
                    size="small"
                    color="primary"
                    className={classes.button}
                  >
                    Previous Battle{' '}
                  </Button>
                </Link>
                <Link
                  to={`/battles/${battle.BattleIndex + 1}`}
                  className={classes.margin}
                >
                  <Button
                    size="small"
                    color="primary"
                    className={classes.button}
                  >
                    Next Battle{' '}
                  </Button>
                </Link>
              </RightLinkContainer>
            </BattleStyleDescription>
          </AccordionDetails>
        </Accordion>
        {battle.Finished === 1 && battle.BattleType === 'NM' && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="body1">Leader history</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {allBattleTimes !== null && allBattleTimes !== [] ? (
                <LeaderHistory allFinished={allBattleTimes} />
              ) : null}
            </AccordionDetails>
          </Accordion>
        )}
        {!(battleStatus(battle) === 'Queued') && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="body1">Chat</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ChatView
                start={Number(battle.Started)}
                end={
                  Number(battle.Started) + Number((battle.Duration + 2) * 60)
                }
                // battleEndEvent: when the battle ends compared to the start prop
                battleEnd={Number(battle.Duration * 60)}
                paginated
              />
            </AccordionDetails>
          </Accordion>
        )}
      </div>
    </Root>
  );
};

const Root = styled.div`
  float: right;
  width: 40%;
  padding: 7px;
  box-sizing: border-box;
  .chatContainer {
    clear: both;
  }
`;

const BattleStyleDescription = styled.div`
  font-size: 14px;
  width: 100%;
  .timeStamp {
    color: #7d7d7d;
  }
  .battleType {
    text-transform: lowercase;
  }
`;

const RightLinkContainer = styled.span`
  float: right;
`;

export default RightBarContainer;