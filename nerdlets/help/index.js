import React from 'react';
import { Grid, GridItem, Stack, StackItem, Link } from 'nr1';
import logo from '../../catalog/screenshots/logo.png';
import neon1 from '../../catalog/screenshots/neon1.png';
import neon2 from '../../catalog/screenshots/neon2.png';

// https://docs.newrelic.com/docs/new-relic-programmable-platform-introduction

export default class HelpNerdlet extends React.Component {
  render() {
    return (
      <div>
        <Stack
          className="toolbar-container"
          fullWidth
          gapType={Stack.GAP_TYPE.NONE}
          horizontalType={Stack.HORIZONTAL_TYPE.FILL_EVENLY}
          verticalType={Stack.VERTICAL_TYPE.FILL}
        >
          <StackItem className="logo-container">
            <img className="neon-logo" src={logo} alt="Neon Logo" />
          </StackItem>
        </Stack>
        <Grid
          className="primary-grid"
          spacingType={[Grid.SPACING_TYPE.NONE, Grid.SPACING_TYPE.NONE]}
        >
          <GridItem className="primary-content-container" columnSpan={12}>
            <main className="primary-content full-height">
              <h1 className="doc-title">Neon Documentation</h1>
              <ul className="docs-section">
                <li>
                  <h3>About Neon</h3>
                </li>
                <p>
                  Neon is an application that allows you to create a status at a
                  glance visualization that can be scaled to track the health of
                  entire business units or regions. Statuses are derived from
                  existing New Relic alert policies or based on values from New
                  Relic events. Neon makes it easy to configure the
                  visualization to show exactly what you need to see.
                </p>
                <div className="screenshots">
                  <img
                    className="fulfillment-screen"
                    src={neon1}
                    alt="Neon Board"
                  />
                  <img
                    className="boards-screen"
                    src={neon2}
                    alt="Neon Boards"
                  />
                </div>

                <br />
                <li>
                  <h3>Dependencies</h3>
                </li>
                <p>
                  To use Neon to monitor your alerts, you need to have New Relic
                  Alerts and a webhook notification channel set up. Instructions
                  for webhook setup is{' '}
                  <Link to="https://github.com/glitton/nr1-neon/blob/documentation/docs/alert_webhook_config.md">
                    here.
                  </Link>
                </p>
              </ul>
            </main>
          </GridItem>
        </Grid>
      </div>
    );
  }
}
