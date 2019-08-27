import React from 'react'
import PropTypes from 'prop-types'

import { nerdlet, AccountsQuery, AccountStorageQuery, UserStorageQuery, UserStorageMutation } from 'nr1'

import BoxSpinner from './box-spinner.js'
import MotherBoard from './mother-board.js'
import Board from './board.js'
import Select from './select.js'

export default class NeonNerdlet extends React.Component {
  static propTypes = {
    nerdletUrlState: PropTypes.object,
    launcherUrlState: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number,
  }

  constructor(props) {
    super(props)

    this.parseAccounts = this.parseAccounts.bind(this)
    this.accountChange = this.accountChange.bind(this)
    this.getBoards = this.getBoards.bind(this)
    this.displayBoard = this.displayBoard.bind(this)
    this.closeBoard = this.closeBoard.bind(this)

    this.state = {
      accounts: [],
      account: [],
      accountId: null,
      boards: {},
      board: null
    }
  }

  componentDidMount() {
    AccountsQuery.query().then(this.parseAccounts)
    UserStorageQuery.query({ collection: 'neondb', documentId: 'lastAccount' }).then(res => (
      console.log(((((res || {}).data || {}).actor || {}).nerdStorage || {}).document)
    ))
  }

  parseAccounts(res) {
    if ('data' in res && 'actor' in res.data && 'accounts' in res.data.actor) {
      const accounts = res.data.actor.accounts.map(a => ({id: a.id, value: a.name}))
      this.setState({
        accounts: accounts
      })
    }
  }

  accountChange(account) {
    const { accounts } = this.state
    const accountId = accounts.filter(a => a.value === account[0]).shift().id

    this.setState({
      account: account,
      accountId: accountId,
      boards: {},
      board: null
    }, this.getBoards)
  }

  getBoards() {
    const { account, accountId } = this.state
    UserStorageMutation.mutate({
      actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: 'neondb',
      documentId: 'lastAccount',
      document: account
    }).then(() => {
      AccountStorageQuery.query({
        collection: 'neondb',
        accountId: accountId,
        documentId: 'boards'
      }).then(res => {
        this.setState({
          boards: (((((res || {}).data || {}).actor || {}).account || {}).nerdStorage || {}).document || {}
        })
      })
    }).catch(err => {
      console.error(err)
    })
  }

  displayBoard(board) {
    const { boards } = this.state
    this.setState({
      board: boards[board]
    })
  }

  closeBoard() {
    this.setState({ board: null })
  }

  render() {
    const { accounts, account, accountId, boards, board } = this.state
    const { launcherUrlState } = this.props

    return (
      <div className="container">
        <Select label="Account" placeholder="Select an account" values={account} options={accounts} onChange={this.accountChange} />
        {!accountId && <BoxSpinner />}
        {accountId && !board && <MotherBoard boards={boards || {}} accountId={accountId} onClicked={this.displayBoard} />}
        {accountId && board && <Board board={board} accountId={accountId} timeRange={launcherUrlState.timeRange} onClose={this.closeBoard} />}
      </div>
    )
  }
}
