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
                  Neon is an application that allows you to create a status
                  visualization at a glance. Neon can be scaled to track the
                  health of entire business units or regions. Statuses are
                  derived from existing New Relic alert policies or from values
                  from New Relic events. Neon makes it easy to configure the
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
                  <br />
                  Using Neon to monitor your events require that you know the
                  attributes you'd like to keep track of. Learn more about
                  attributes{' '}
                  <Link to="https://docs.newrelic.com/docs/using-new-relic/welcome-new-relic/get-started/glossary#attribute">
                    here
                  </Link>
                </p>
                <br />
                <li>
                  <h3>Create A New Board</h3>
                </li>
                <ol className="instructions">
                  <li>
                    Click the plus (+) icon which will open a modal window on
                    the right.
                  </li>
                  <li>
                    In the <strong>BOARD NAME</strong> text field, type in your
                    board title.
                  </li>
                  <li>
                    Using the Event dropdown, select the New Relic event that
                    you would like to display in your board. For example, the
                    New Relic Browser event, PageView.
                  </li>
                  <li>Click the + Add button.</li>
                </ol>
                <br />
                <li>
                  <h3>Setup Board</h3>
                </li>
                <p>
                  To monitor the status of a <strong>New Relic alert </strong>
                  make sure you've set up a{' '}
                  <Link to="https://github.com/glitton/nr1-neon/blob/documentation/docs/alert_webhook_config.md">
                    webhook notification channel.
                  </Link>
                  <br />
                  Then perform the following steps:
                </p>
                <ol className="instructions">
                  <li>Click on setup board.</li>
                  <li>
                    In the Board Details section , click on the Rows tab and
                    type in a title to one or multiple rows in the Title text
                    field.
                  </li>
                  <li>
                    Click the + Add button which enables your row title to be
                    displayed on the board. Repeat the same step to add more row
                    titles.
                  </li>
                  <li>
                    Click on the column tab and type in your column name in the
                    Title text field. Click on the + Add button. Repeat the same
                    step to add more column titles.
                  </li>
                  <li>
                    Click on the Cells tab, using the SELECT A ROW and SELECT A
                    COLUMN dropdowns, select the Row and Column titles.
                  </li>
                  <li>
                    Click on the SELECT DATA TYPE dropdown and select New Relic
                    Alert. In the Alert Policy text field, enter the webhook
                    policy name <i>exactly</i> as you've named it in New Relic
                    Alerts.
                  </li>
                  <li>Click the + Add button to finish.</li>
                </ol>
                <br />
                <p>
                  To monitor the status of a <strong>New Relic event </strong>
                  such as if the average duration of a Page View event that
                  exceeded a certain value repeat steps 1 to 5 from the alert
                  setup.
                </p>
                <ul>
                  <li>For step 6 select New Relic Attribute</li>
                  <li>
                    In the Attribute Name text field, type in the attribute name
                    like duration. Optionally you can prepend the attribute with
                    an aggregator function such as average(duration).
                  </li>
                  <li>
                    Click on the COMPARISON dropdown and select less than,
                    equals, or greater than.
                  </li>
                  <li>
                    In the Value text field, type in the value that you'd like
                    Neon to monitor.
                  </li>
                  <li>
                    For example, Neon can inform you when the average duration
                    of a Page View event exceeds 1 second. Set up Neon using the
                    average(duration) attribute name, with a COMPARISON of
                    greater than, and a value of 1. When this event occurs, Neon
                    will display that actual number that exceeded 1 in red.
                  </li>
                </ul>
                <br />
                <li>
                  <h3>View Boards</h3>
                  <p>
                    To view all the boards that you have in your account, click
                    on view boards.
                  </p>
                </li>
                <br />
                <li>
                  <h3>Edit Board</h3>
                </li>
                <p>
                  To edit your row and/or column titles, go to the board that
                  you'd like to edit and click on edit board.
                </p>
                <ol>
                  <li>
                    Click on the row or column tab and click on the edit button
                    to edit the row or column title
                  </li>
                  <li>
                    Type in the new row or column name and click the save
                    button.
                  </li>
                  <li>Click the cancel button to cancel editing.</li>
                  <li>
                    Click the delete button to delete the row or column title.
                  </li>
                  <li>
                    Click the X icon in the upper right corner or anywhere
                    outside the modal to exit edit mode.
                  </li>
                </ol>
                <br />
                <li>
                  <h3>Delete Board</h3>
                </li>
                <p>Click on delete board to completely get rid of a board.</p>
                <br />
              </ul>
            </main>
          </GridItem>
        </Grid>
      </div>
    );
  }
}
