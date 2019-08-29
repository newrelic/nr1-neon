import React from 'react'
import PropTypes from 'prop-types'

import { nerdlet, Toast, AccountsQuery, AccountStorageQuery, AccountStorageMutation, UserStorageQuery, UserStorageMutation, NerdGraphQuery } from 'nr1'

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
      currentUser: {},
      boards: {},
      board: null
    }
  }

  componentDidMount() {
    AccountsQuery.query().then(this.parseAccounts).then(() => {
      return UserStorageQuery.query({ collection: 'neondb', documentId: 'lastAccount' })
    }).then(res => {
      const lastAccount = ((((res || {}).data || {}).actor || {}).nerdStorage || {}).document
      if (lastAccount) this.accountChange(lastAccount)

      const gql = `{ actor { user { email id name } } }`
      return NerdGraphQuery.query({query: gql})
    }).then(res => {
      const user = (((res || {}).data || {}).actor || {}).user
      if (user) this.setState({
        currentUser: (user) ? {
          email: ('email' in user) ? user.email : null,
          id: ('id' in user) ? user.id : null,
          name: ('name' in user) ? user.name : null} : {}
      })
    })
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
      Toast.showToast('Unable to fetch data', {description: err.message || '', type: Toast.TYPE.CRITICAL})
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
    const { accounts, account, accountId, boards, board, currentUser } = this.state
    const { launcherUrlState } = this.props

    return (
      <div className="container">
        <Select label="Account" placeholder="Select an account" values={account} options={accounts} onChange={this.accountChange} />
        {!accountId && <BoxSpinner />}
        {accountId && !board && <MotherBoard boards={boards || {}} accountId={accountId} onClicked={this.displayBoard} />}
        {accountId && board && <Board board={board} accountId={accountId} currentUser={currentUser} timeRange={launcherUrlState.timeRange} onClose={this.closeBoard} />}
      </div>
    )
  }
}
