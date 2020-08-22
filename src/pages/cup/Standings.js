import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import DerpTable from 'components/Table/DerpTable';
import DerpTableCell from 'components/Table/DerpTableCell';
import TableRow from '@material-ui/core/TableRow';
import Grid from '@material-ui/core/Grid';
import Header from 'components/Header';
import { calculateStandings } from 'utils/cups';

const Standings = props => {
  const { events, cup } = props;
  const [standings, setStandings] = useState({});

  useEffect(() => {
    setStandings(calculateStandings(events, cup, false));
  }, []);

  return (
    <Grid container spacing={0}>
      <Grid item xs={12} md={6}>
        <Container>
          <Header h2>Players</Header>
          {standings.player && (
            <DerpTable
              headers={['#', 'Player', 'Points']}
              length={standings.player.length}
            >
              {standings.player.map((r, no) => (
                <TableRow hover key={r.KuskiIndex}>
                  <DerpTableCell>{no + 1}.</DerpTableCell>
                  <DerpTableCell>{r.Kuski}</DerpTableCell>
                  <DerpTableCell right>
                    {r.Points} point{r.Points > 1 ? 's' : ''}
                  </DerpTableCell>
                </TableRow>
              ))}
            </DerpTable>
          )}
        </Container>
      </Grid>
      <Grid item xs={12} md={6}>
        <Container>
          <Header h2>Teams</Header>
          {standings.team && (
            <DerpTable
              headers={['#', 'Team', 'Points']}
              length={standings.team.length}
            >
              {standings.team.map((r, no) => (
                <TableRow hover key={r.Team}>
                  <DerpTableCell>{no + 1}.</DerpTableCell>
                  <DerpTableCell>{r.Team}</DerpTableCell>
                  <DerpTableCell right>
                    {r.Points} point{r.Points > 1 ? 's' : ''}
                  </DerpTableCell>
                </TableRow>
              ))}
            </DerpTable>
          )}
          <Header h2>Nations</Header>
          {standings.team && (
            <DerpTable
              headers={['#', 'Nation', 'Points']}
              length={standings.nation.length}
            >
              {standings.nation.map((r, no) => (
                <TableRow hover key={r.Country}>
                  <DerpTableCell>{no + 1}.</DerpTableCell>
                  <DerpTableCell>{r.Country}</DerpTableCell>
                  <DerpTableCell right>
                    {r.Points} point{r.Points > 1 ? 's' : ''}
                  </DerpTableCell>
                </TableRow>
              ))}
            </DerpTable>
          )}
        </Container>
      </Grid>
    </Grid>
  );
};

const Container = styled.div`
  padding-left: 8px;
  padding-right: 8px;
`;

export default Standings;
