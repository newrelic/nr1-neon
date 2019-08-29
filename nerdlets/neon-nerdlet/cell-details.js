import React from 'react'
import PropTypes from 'prop-types'

import { NerdGraphQuery, AccountStorageQuery, AccountStorageMutation } from 'nr1'

export default class CellDetails extends React.Component {
  static propTypes = {
    board: PropTypes.object,
    accountId: PropTypes.number,
    currentUser: PropTypes.object,
    cell: PropTypes.object
  }

  constructor(props) {
    super(props)

    this.state = {
      timeline: {},
      comment: ''
    }

    this.saveComment = this.saveComment.bind(this)
    this.getCellDetails = this.getCellDetails.bind(this)
    this.fetchComments = this.fetchComments.bind(this)
  }

  componentDidMount() {
    this.getCellDetails()
  }

  componentDidUpdate(prevProps) {
    const { cell } = this.props
    const prevCell = (this.prevProps || {}).cell
  }

  saveComment() {
    const { timeline, comment } = this.state
    const { boardId, accountId, currentUser } = this.props

    const timestamp = (new Date()).getTime()

    timeline[timestamp] = {comment: comment, timestamp: timestamp, user: currentUser}

    this.setState({
      timeline: timeline,
      comment: ''
    })
  }

  getCellDetails() {
    const { timeline } = this.state
    const { board, accountId, cell } = this.props

    const data = {}
    if (cell.policy) data.query = `SELECT condition_name, current_state, details, duration, incident_url, violation_chart_url FROM ${board.event} WHERE policy_name = '${cell.policy}' SINCE 30 days ago LIMIT MAX`
    if (cell.details) data.query = ``

    const gql = `{
      actor {
        account(id: ${accountId}) {
          nrql(query: "${data.query}") {
            results
          }
        }
      }
    }`

    NerdGraphQuery.query({query: gql}).then(res => {
      const results = (((((res || {}).data || {}).actor || {}).account || {}).nrql || {}).results || []
      this.setState({
        timeline: results.reduce((a, c) => {
          a[c.timestamp] = {event: c}
          return a
        }, timeline)
      }, () => this.fetchComments())
    })
  }

  fetchComments() {
    const { timeline } = this.state
    const { board, accountId } = this.props

    AccountStorageQuery.query({collection: 'neondb-' + board.id, accountId: accountId, documentId: 'comments'}).then(res => {
      const results = (((((res || {}).data || {}).actor || {}).account || {}).nerdStorage || {}).document
      // TODO: load comments from nerdstore
    })
  }

  render() {
    const { timeline, comment } = this.state
    const { cell } = this.props

    return (
      <div>
        <div className="about">
          {'policy' in cell && (<h4>{cell.policy} over last 30 days</h4>)}
        </div>
        <div className="timeline">
          <ul>
            {Object.keys(timeline).sort().reverse().map(t => (
              <li key={t}>
                {'event' in timeline[t] && <div className={'bullet ' + ((timeline[t].event.current_state === 'open') ? 'alert' : (timeline[t].event.current_state === 'closed') ? 'ok' : 'unknown')}></div>}
                {'event' in timeline[t] && (
                  <div className="desc">
                    <h5>{'Incident ' + timeline[t].event.current_state}</h5>
                    <span className="details">{timeline[t].event.details}</span>
                    {timeline[t].event.current_state === 'closed' && (
                      <span className="details">Incident lasted {new Intl.NumberFormat('en-US', {style: 'decimal', maximumFractionDigits: 2}).format((timeline[t].event.duration/60000))} minutes</span>
                    )}
                    <span className="options">{new Intl.DateTimeFormat('en-US', {dateStyle: 'full', timeStyle: 'long'}).format(new Date(timeline[t].event.timestamp))}</span>
                  </div>
                )}
                {'comment' in timeline[t] && (
                  <div className="comment">
                    {'user' in timeline[t] && 'name' in timeline[t].user && <span className="details">{timeline[t].user.name}</span>}
                    <span className="options">{new Intl.DateTimeFormat('en-US', {dateStyle: 'full', timeStyle: 'long'}).format(new Date(timeline[t].timestamp))}</span>
                    <div className="message">{timeline[t].comment}</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <input className="textarea" type="text" placeholder="Comment here..." value={comment} onChange={e => {this.setState({comment: e.target.value})}} onKeyPress={e => {if (e.key === 'Enter') this.saveComment()}} />
        </div>
      </div>
    )
  }
}
