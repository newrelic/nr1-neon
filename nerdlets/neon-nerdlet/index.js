import React from 'react';
import PropTypes from 'prop-types';

import {
  Toast,
  AccountsQuery,
  AccountStorageQuery,
  UserStorageQuery,
  UserStorageMutation,
  NerdGraphQuery,
  Grid,
  GridItem,
  HeadingText,
  Stack,
  StackItem,
  Button,
  navigation,
  PlatformStateContext,
  nerdlet,
} from 'nr1';

import { EmptyState } from '@newrelic/nr1-community';
import logo from '../../docs/images/logo.png';

import BoxSpinner from './box-spinner.js';
import MotherBoard from './mother-board.js';
import Board from './board.js';

// Below is based on the Nerdpack Layout Standard component found in
// https://github.com/newrelic/nr1-nerdpack-layout-standard/blob/main/nerdlets/nerdpack-layout-standard-nerdlet/index.js

export default class NeonNerdlet extends React.Component {
  static contextType = PlatformStateContext;
  static propTypes = {
    launcherUrlState: PropTypes.object,
    nerdletUrlState: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number,
  };

  constructor(props) {
    super(props);

    this.parseAccounts = this.parseAccounts.bind(this);
    this.accountChange = this.accountChange.bind(this);
    this.hideEmptyState = this.hideEmptyState.bind(this);
    this.showHelpDocs = this.showHelpDocs.bind(this);
    this.getBoards = this.getBoards.bind(this);
    this.displayBoard = this.displayBoard.bind(this);
    this.closeBoard = this.closeBoard.bind(this);
    this.updateBoards = this.updateBoards.bind(this);

    this.state = {
      accounts: [],
      account: { name: '' },
      accountId: null,
      currentUser: {},
      boards: {},
      board: null,
      emptyStateHidden: false,
    };
  }

  componentDidMount() {
    nerdlet.setConfig({
      accountPicker: true,
      accountPickerValues: [
        nerdlet.ACCOUNT_PICKER_VALUE.CROSS_ACCOUNT,
        ...nerdlet.ACCOUNT_PICKER_DEFAULT_VALUES,
      ],
    });

    const gql = `{ actor { user { email id name } } }`;
    NerdGraphQuery.query({
      query: gql,
      fetchPolicyType: NerdGraphQuery.FETCH_POLICY_TYPE.NO_CACHE,
    }).then(res => {
      const user = (((res || {}).data || {}).actor || {}).user;
      if (user)
        this.setState({
          currentUser: user
            ? {
                email: 'email' in user ? user.email : null,
                id: 'id' in user ? user.id : null,
                name: 'name' in user ? user.name : null,
              }
            : {},
        });
    });
  }

  componentDidUpdate() {
    if (this.context.accountId !== this.state.accountId) {
      this.setState({ accountId: this.context.accountId }, () =>
        this.getBoards()
      );
    }
  }

  parseAccounts(res) {
    if ('data' in res) {
      const accounts = res.data;
      const firstAccount = accounts[0];

      this.setState(
        {
          accounts: accounts,
        },
        () => {
          this.accountChange(firstAccount);
        }
      );
    }
  }

  accountChange(account) {
    const { accounts } = this.state;
    const hasAccess = accounts.find(a => a.name == account.name);

    if (hasAccess) {
      const accountId = account.id;

      this.setState(
        {
          account: account,
          accountId: accountId,
          boards: {},
          board: null,
        },
        this.getBoards
      );
    }
  }

  hideEmptyState() {
    const { emptyStateHidden } = this.state;
    this.setState({ emptyStateHidden: true });
  }

  showHelpDocs() {
    navigation.openStackedNerdlet({ id: 'help' });
  }

  getBoards() {
    const { account, accountId } = this.state;
    const accountName = account.name;

    AccountStorageQuery.query({
      collection: 'neondb',
      accountId: accountId,
      documentId: 'boards',
    })
      .then(res => {
        this.setState({
          boards: (res || {}).data || {},
        });
      })
      .catch(err => {
        Toast.showToast({
          title: 'Unable to fetch data',
          description: err.message || '',
          type: Toast.TYPE.CRITICAL,
        });
      });
  }

  displayBoard(board) {
    const { boards } = this.state;
    this.setState({
      board: boards[board],
    });
  }

  closeBoard(_boards) {
    const { boards } = this.state;
    this.setState({ board: null, boards: _boards ? _boards : boards });
  }

  updateBoards(boards) {
    this.setState({ boards: boards });
  }

  render() {
    const {
      accounts,
      account,
      accountId,
      boards,
      board,
      currentUser,
      emptyStateHidden,
    } = this.state;

    const { launcherUrlState } = this.props;
    const noBoardsExist = Object.keys(boards).length === 0;

    console.log(accountId);

    return (
      <PlatformStateContext.Consumer>
        {platformState => (
          <>
            <Stack
              className="toolbar-container"
              fullWidth
              gapType={Stack.GAP_TYPE.NONE}
              horizontalType={Stack.HORIZONTAL_TYPE.FILL_EVENLY}
              verticalType={Stack.VERTICAL_TYPE.FILL}
            >
              <StackItem className="toolbar-section1">
                <Stack
                  directionType={Stack.DIRECTION_TYPE.HORIZONTAL}
                  gapType={Stack.GAP_TYPE.NONE}
                  fullWidth
                  fullHeight
                  verticalType={Stack.VERTICAL_TYPE.LEFT}
                >
                  <StackItem>
                    <img className="neon-logo" src={logo} alt="Neon Logo" />
                  </StackItem>
                </Stack>
              </StackItem>
              <Stack
                fullWidth
                fullHeight
                verticalType={Stack.VERTICAL_TYPE.CENTER}
                horizontalType={Stack.HORIZONTAL_TYPE.CENTER}
              ></Stack>
              <StackItem className="toolbar-section2">
                <Stack
                  fullWidth
                  fullHeight
                  verticalType={Stack.VERTICAL_TYPE.CENTER}
                  horizontalType={Stack.HORIZONTAL_TYPE.RIGHT}
                >
                  <StackItem>
                    <Button
                      className="help-button"
                      type={Button.TYPE.PRIMARY}
                      onClick={this.showHelpDocs}
                    >
                      Help
                    </Button>
                  </StackItem>
                </Stack>
              </StackItem>
            </Stack>
            <Grid
              className="primary-grid"
              spacingType={[Grid.SPACING_TYPE.NONE, Grid.SPACING_TYPE.NONE]}
            >
              <GridItem className="primary-content-container" columnSpan={12}>
                <main className="primary-content full-height">
                  {(!accountId || accountId === 'cross-account') && (
                    <>
                      <BoxSpinner />
                      <EmptyState
                        heading="Welcome to Neon!"
                        description="Seeing the spinner?  Let's make it stop.  Choose your account from the drop down menu on the upper left. Before you begin, review the HELP documentation to understand dependencies and steps to getting started."
                        buttonText=""
                      />
                    </>
                  )}
                  {accountId &&
                    accountId !== 'cross-account' &&
                    noBoardsExist &&
                    !emptyStateHidden && (
                      <EmptyState
                        heading="Looks like you have no boards so let's change that!"
                        description="Review the HELP documentation to understand dependencies and steps to getting started.  Ready to start?  Close this message and click the plus (+) icon to create a new board."
                        buttonText="Close"
                        buttonOnClick={this.hideEmptyState}
                      />
                    )}
                  {accountId && accountId !== 'cross-account' && !board && (
                    <MotherBoard
                      boards={boards || {}}
                      accountId={accountId}
                      onClicked={this.displayBoard}
                    />
                  )}
                  {accountId && accountId !== 'cross-account' && board && (
                    <Board
                      board={board}
                      boards={boards}
                      accountId={accountId}
                      currentUser={currentUser}
                      timeRange={platformState.timeRange}
                      onClose={this.closeBoard}
                      onUpdate={this.updateBoards}
                    />
                  )}
                </main>
              </GridItem>
            </Grid>
          </>
        )}
      </PlatformStateContext.Consumer>
    );
  }
}
