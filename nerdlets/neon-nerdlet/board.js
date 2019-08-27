import React from 'react'
import PropTypes from 'prop-types'

import { launcher, nerdlet, AccountStorageQuery, AccountStorageMutation, NerdGraphQuery, Icon, Modal, Tabs, TabsItem, TextField, Button } from 'nr1'

import Select from './select.js'

export default class Board extends React.Component {
  static propTypes = {
    board: PropTypes.object,
    accountId: PropTypes.number,
    timeRange: PropTypes.object,
    onClose: PropTypes.func
  }

  constructor(props) {
    super(props)

    this.state = {
      data: {},
      rows: [],
      rowName: '',
      rowForCell: [],
      cols: [],
      colName: '',
      colForCell: [],
      cells: [],
      policyName: '',
      alerts: {},
      board:  ((props || {}).board || {}).name || '',
      event: ((props || {}).board || {}).event,
      modalHidden: true
    }

    this.getBoard = this.getBoard.bind(this)
    this.openAdmin = this.openAdmin.bind(this)
    this.closeAdmin = this.closeAdmin.bind(this)
    this.textUpdated = this.textUpdated.bind(this)
    this.cellSelect = this.cellSelect.bind(this)
    this.addData = this.addData.bind(this)
    this.getCell = this.getCell.bind(this)
    this.persistData = this.persistData.bind(this)
    this.fetchAlertStatuses = this.fetchAlertStatuses.bind(this)
    this.parseAlertStatuses = this.parseAlertStatuses.bind(this)

    // nerdlet.setUrlState({
    //   id: ((props || {}).board || {}).id
    // })
  }

  componentDidMount() {
    this.getBoard()
  }

  getBoard() {
    const { board, accountId } = this.props

    if (!board || !('id' in board)) return

    AccountStorageQuery.query({
      collection: 'neondb-' + board.id,
      accountId: accountId,
      documentId: 'data'}).then(res => {
        const data = (((((res || {}).data || {}).actor || {}).account || {}).nerdStorage || {}).document || {}
        this.setState({
          cells: (data && 'cells' in data) ? data.cells : [],
          cols: (data && 'cols' in data) ? data.cols : [],
          rows: (data && 'rows' in data) ? data.rows : []
        }, this.fetchAlertStatuses(data.cells))
      })
  }

  openAdmin(e) {
    e.preventDefault()
    this.setState({ modalHidden: false })
  }

  closeAdmin() {
    this.setState({ modalHidden: true })
  }

  textUpdated(e, type) {
    const o = {}
    o[type + 'Name'] = e.target.value
    this.setState(o)
  }

  cellSelect(val, type) {
    const o = {}
    o[type + 'ForCell'] = val
    this.setState(o)
  }

  addData(type) {
    const { rows, rowName, rowForCell, cols, colName, colForCell, cells, policyName } = this.state

    if (type === 'row') {
      if (rows.filter(r => (r === rowName)).length) return
      rows.push(rowName)
      this.setState({
        rows: rows,
        rowName: ''
      }, this.persistData)
    } else if (type === 'col') {
      if (cols.filter(c => (c === colName)).length) return
      cols.push(colName)
      this.setState({
        cols: cols,
        colName: ''
      }, this.persistData)
    } else if (type === 'cell') {
      cells.push({row: rowForCell[0], col: colForCell[0], policy: policyName})
      this.setState({
        cells: cells,
        rowForCell: [],
        colForCell: [],
        policyName: ''
      }, this.persistData)
    }
  }

  getCell(row, col) {
    const { cells, alerts } = this.state

    const match = cells.filter(cell => (cell.row === row && cell.col === col))

    const cls = (match.length === 1) ? ((match[0].policy in alerts) ? 'alert' : 'ok') : "unknown"
    return <span className={'circle ' + cls} />
  }

  persistData() {
    const { rows, cols, cells } = this.state
    const { board, accountId } = this.props

    AccountStorageMutation.mutate({
      actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: 'neondb-' + board.id,
      accountId: accountId,
      documentId: 'data',
      document: { rows: rows, cols: cols, cells: cells }
    })
  }

  fetchAlertStatuses(cells) {
    if (!cells) cells = this.state.cells
    const { fetching } = this.state
    if (fetching) return
    const { accountId, timeRange } = this.props

    const policies = cells.map((c, i) => ('\'' + c.policy + '\''))
    if (!policies.length) return

    const gql = `{
      actor {
        account(id: ${accountId}) {
          nrql(query: "SELECT latest(current_state) AS 'AlertStatus', latest(incident_id) AS 'IncidentId' FROM AlertsEvent WHERE policy_name IN (${policies.join(',')}) FACET policy_name, condition_name ${'SINCE ' + (timeRange && timeRange.duration ? timeRange.duration : timeRange.begin_time + ' UNTIL ' + timeRange.end_time)} LIMIT MAX") {
            results
          }
        }
      }
    }`

    this.setState({
      fetching: true
    })

    NerdGraphQuery.query({query: gql}).then(this.parseAlertStatuses).catch(err => {
      this.setState({
        fetching: false
      })
    }).finally(() => {
      setTimeout(this.fetchAlertStatuses, 60000)
    })
  }

  parseAlertStatuses(res) {
    const results = (((((res || {}).data || {}).actor || {}).account || {}).nrql || {}).results
    const alerts = {}

    results.map(r => {
      if (r.AlertStatus === 'open') alerts[r.facet[0]] = (r.facet[0] in alerts) ? (alerts[r.facet[0]] + 1) : 1
    })

    this.setState({
      alerts: alerts,
      fetching: false
    })
  }

  render() {
    const { data, modalHidden, rows, rowName, rowForCell, cols, colName, colForCell, policyName, board } = this.state

    return (
      <div>
        <div className="board-title">
          <h2>{board}</h2>
        </div>
        <table className="board-table">
          <thead>
            <tr>
              <th></th>
              {cols.map(c => (<th className="rotate" key={c}><div><span>{c}</span></div></th>))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r}>
                <th className="row-header">{r}</th>
                {cols.map(c => (<td key={r+'-'+c}>{this.getCell(r, c)}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="control-bar">
          <a href="#" className="default" onClick={(e) => this.openAdmin(e)}>admin</a>
        </div>
        <Modal hidden={modalHidden} onClose={this.closeAdmin}>
          <h3>Board Details</h3>
          <Tabs>
            <TabsItem itemKey="tab-rows" label="Rows">
              <div style={{display: 'grid', gridTemplateColumns: '1fr', gridGap: '1em', marginTop: '2em'}}>
                <TextField label="Title" placeholder="" onChange={(e) => this.textUpdated(e, 'row')} value={rowName} />
                <Button iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS} onClick={() => this.addData('row')}>Add</Button>
              </div>
            </TabsItem>
            <TabsItem itemKey="tab-cols" label="Columns">
              <div style={{display: 'grid', gridTemplateColumns: '1fr', gridGap: '1em', marginTop: '2em'}}>
                <TextField label="Title" placeholder="" onChange={(e) => this.textUpdated(e, 'col')} value={colName} />
                <Button iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS} onClick={() => this.addData('col')}>Add</Button>
              </div>
            </TabsItem>
            <TabsItem itemKey="tab-cells" label="Cells">
              <div style={{display: 'grid', gridTemplateColumns: '1fr', gridGap: '1em', marginTop: '2em'}}>
                <Select label="Row" placeholder="" values={rowForCell || []} options={rows.map(r => ({value: r}))} onChange={(val) => this.cellSelect(val, 'row')} />
                <Select label="Column" placeholder="" values={colForCell || []} options={cols.map(c => ({value: c}))} onChange={(val) => this.cellSelect(val, 'col')} />
                <TextField label="Alert Policy" placeholder="" onChange={(e) => this.textUpdated(e, 'policy')} value={policyName} />
                <Button iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS} onClick={() => this.addData('cell')}>Add</Button>
              </div>
            </TabsItem>
          </Tabs>
        </Modal>
      </div>
    )
  }
}
