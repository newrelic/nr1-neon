import React from 'react'
import PropTypes from 'prop-types'

import { AccountsQuery } from 'nr1'

import BoxSpinner from './box-spinner.js'
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

    this.state = {
      accounts: [],
      account: []
    }
  }

  componentDidMount() {
    AccountsQuery.query().then(this.parseAccounts)
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
    console.log('selected...', account)
    this.setState({account: account})
  }

  render() {
    const { accounts, account, boards, board } = this.state
    
    return (
      <div className="container">
        <Select label="Account" placeholder="Select an account" values={account} options={accounts} onChange={this.accountChange} />
        {!account.length && <BoxSpinner />}
      </div>
    )
  }
}
