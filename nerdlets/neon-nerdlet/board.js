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
      cellType: '',
      policyName: '',
      attributeName: '',
      isType: '',
      valueName: '',
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
    this.optionChange = this.optionChange.bind(this)
    this.addData = this.addData.bind(this)
    this.persistData = this.persistData.bind(this)
    this.fetchAlertStatuses = this.fetchAlertStatuses.bind(this)
    this.parseAlertStatuses = this.parseAlertStatuses.bind(this)
    this.getCellContent = this.getCellContent.bind(this)

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

  optionChange(val, type) {
    const o = {}
    o[type + 'Type'] = val
    this.setState(o)
  }

  addData(type) {
    const { rows, rowName, rowForCell, cols, colName, colForCell, cells, cellType, policyName, attributeName, isType, valueName } = this.state

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
      if (cells.reduce((a, c) => (a || (c.row === rowForCell[0] && c.col === colForCell[0])), false)) return
      if (cellType === 'alert') {
        if (!policyName) return
        cells.push({row: rowForCell[0], col: colForCell[0], policy: policyName})
      } else if (cellType === 'data') {
        if (!attributeName) return
        const deets = {}
        const attr = attributeName.split(/ as /i)
        if (attr.length === 2) deets.name = attr[1].replace(/[^\w]/gi, '')
        if (attr.length === 1 || attr.length === 2) {
          const attrParts = attr[0].split('(')
          deets.key = (attrParts[1] || attrParts[0]).replace(/[^\w]/gi, '')
          deets.func = (attrParts.length === 2) ? attrParts[0].replace(/[^\w]/gi, '') : 'latest'
        }
        if (!('name' in deets)) deets.name = deets.func + '_' + deets.key
        deets.str = deets.func + '(' + deets.key + ')' + ' AS ' + deets.name
        deets.is = isType
        deets.value = valueName
        cells.push({row: rowForCell[0], col: colForCell[0], attribute: attributeName, details: deets})
      }
      this.setState({
        cells: cells,
        rowForCell: [],
        colForCell: [],
        cellType: '',
        policyName: '',
        attributeName: '',
        isType: '',
        valueName: ''
      }, this.persistData)
    }
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
    const { board, accountId, timeRange } = this.props

    const { policies, attributes, data } = cells.reduce((a, c) => {
      if (c.policy) a.policies.push('\'' + c.policy + '\'')
      if (c.details) a.attributes.push(c.details.str)
      return a
    }, {policies: [], attributes: []})

    const timePeriod = 'SINCE ' + (timeRange && timeRange.duration ? timeRange.duration : timeRange.begin_time + ' UNTIL ' + timeRange.end_time)
    const alertsQuery = (policies.length) ? `alerts: nrql(query: "SELECT latest(current_state) AS 'AlertStatus', latest(incident_id) AS 'IncidentId' FROM ${board.event} WHERE policy_name IN (${policies.join(',')}) FACET policy_name, condition_name ${timePeriod} LIMIT MAX") { results }` : ''
    const valuesQuery = (attributes.length) ? `values: nrql(query: "SELECT ${attributes.join(', ')} FROM ${board.event} ${timePeriod} LIMIT 1") { results }` : ''

    const gql = `{
      actor {
        account(id: ${accountId}) {
          ${alertsQuery}
          ${valuesQuery}
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
    const results = (((res || {}).data || {}).actor || {}).account || {}
    const alertsResults = (results.alerts || {}).results
    const valuesResults = ((results.values || {}).results || [])[0]

    const alerts = alertsResults.reduce((a, c) => {
      if (c.AlertStatus === 'open') a[c.facet[0]] = ((c.facet[0] in a) ? (a[c.facet[0]] + 1) : 1)
      return a
    }, {})

    if (valuesResults && 'timestamp' in valuesResults) delete valuesResults.timestamp

    const data = Object.keys(valuesResults).reduce((a, c) => {
      a[c] = parseFloat(valuesResults[c])
      return a
    }, {})

    this.setState({
      data: data,
      alerts: alerts,
      fetching: false
    })
  }

  getCellContent(row, col) {
    const { data, cells, alerts } = this.state

    const match = cells.filter(cell => (cell.row === row && cell.col === col)).shift()

    if (!match) return <span className={'circle unknown'} />

    if (match.policy) {
      return <span className={'circle ' + ((match.policy in alerts) ? 'alert' : 'ok')} />
    } else if (match.details) {
      return <span className={'text '}>{data[match.details.name]}</span>
    }

  }

  render() {
    const { data, modalHidden, rows, rowName, rowForCell, cols, colName, colForCell, cellType, policyName, attributeName, isType, valueName, board } = this.state

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
                {cols.map(c => (<td key={r+'-'+c}>{this.getCellContent(r, c)}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="control-bar">
          <a href="#" className="default" onClick={(e) => this.openAdmin(e)}>admin</a>
        </div>
        <Modal hidden={modalHidden} onClose={this.closeAdmin}>
          <div>
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
                  <ul class="segmented-control">
                      <li class="segmented-control__item">
                          <input class="segmented-control__input" type="radio" name="cell-alert" value="alert" checked={cellType === 'alert'} />
                          <label class="segmented-control__label" for="cell-alert"  onClick={(e) => this.optionChange('alert', 'cell')}>NR Alert</label>
                      </li>
                      <li class="segmented-control__item">
                          <input class="segmented-control__input" type="radio" name="cell-data" value="data" checked={cellType === 'data'} />
                          <label class="segmented-control__label" for="cell-data" onClick={(e) => this.optionChange('data', 'cell')}>NR Data</label>
                      </li>
                  </ul>
                  {cellType === 'alert' && <TextField label="Alert Policy" placeholder="" onChange={(e) => this.textUpdated(e, 'policy')} value={policyName} />}
                  {cellType === 'data' && (
                    <div>
                    <TextField label="Attribute Name" placeholder="" onChange={(e) => this.textUpdated(e, 'attribute')} value={attributeName} />
                    <div style={{display: 'grid', gridTemplateColumns: '3fr 1fr', gridGap: '.5em', alignItems: 'center'}}>
                      <ul class="segmented-control">
                          <li class="segmented-control__item">
                              <input class="segmented-control__input" type="radio" name="is-less" value="alert" checked={isType === 'less'} />
                              <label class="segmented-control__label" for="is-more"  onClick={(e) => this.optionChange('less', 'is')}>less than</label>
                          </li>
                          <li class="segmented-control__item">
                              <input class="segmented-control__input" type="radio" name="is-equal" value="equal" checked={isType === 'equal'} />
                              <label class="segmented-control__label" for="is-equal" onClick={(e) => this.optionChange('equal', 'is')}>equals</label>
                          </li>
                          <li class="segmented-control__item">
                              <input class="segmented-control__input" type="radio" name="is-more" value="alert" checked={isType === 'more'} />
                              <label class="segmented-control__label" for="is-more"  onClick={(e) => this.optionChange('more', 'is')}>greater than</label>
                          </li>
                      </ul>
                      <TextField label="Value" placeholder="" onChange={(e) => this.textUpdated(e, 'value')} value={valueName} style={{marginBottom: '.75em'}} />
                    </div>
                    </div>
                  )}
                  <Button iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS} onClick={() => this.addData('cell')}>Add</Button>
                </div>
              </TabsItem>
            </Tabs>
          </div>
        </Modal>
      </div>
    )
  }
}
