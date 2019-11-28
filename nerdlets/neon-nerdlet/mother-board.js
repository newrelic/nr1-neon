import React from 'react';
import PropTypes from 'prop-types';

import {
  Icon,
  Modal,
  TextField,
  Button,
  Toast,
  AccountStorageMutation,
  NerdGraphQuery,
  Tooltip,
} from 'nr1';

import ComboBox from './combo-box.js';

export default class MotherBoard extends React.Component {
  static propTypes = {
    boards: PropTypes.object,
    accountId: PropTypes.number,
    onClicked: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.boardClicked = this.boardClicked.bind(this);
    this.showAddBoardModal = this.showAddBoardModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.textUpdated = this.textUpdated.bind(this);
    this.addBoard = this.addBoard.bind(this);
    this.deleteBoard = this.deleteBoard.bind(this);
    this.generateUUID = this.generateUUID.bind(this);

    this.state = {
      modalHidden: true,
      events: [],
    };
  }

  componentDidMount() {
    const { accountId } = this.props;
    const gql = `{ actor { account(id: ${accountId}) { nrql(query: "SHOW EVENT TYPES") { results } } } }`;
    NerdGraphQuery.query({ query: gql }).then(res => {
      const results =
        (((((res || {}).data || {}).actor || {}).account || {}).nrql || {})
          .results || [];
      this.setState({
        events: results.map(r => r.eventType),
      });
    });
  }

  boardClicked(e, id) {
    e.preventDefault();

    const { onClicked } = this.props;
    if (onClicked) onClicked(id);
  }

  showAddBoardModal(e) {
    e.preventDefault();
    this.setState({
      modalHidden: false,
    });
  }

  closeModal() {
    this.setState({
      modalHidden: true,
    });
  }

  textUpdated(e, type) {
    const o = {};
    o[type + 'Name'] = e.target.value;
    this.setState(o);
  }

  eventUpdated(value) {
    this.setState({
      eventName: value,
    });
  }

  addBoard() {
    const { boardName, eventName } = this.state;
    const { boards, accountId } = this.props;

    if (
      boardName &&
      eventName &&
      boardName.trim() !== '' &&
      eventName.trim() !== ''
    ) {
      const id = this.generateUUID();

      boards[id] = {
        id: id,
        name: boardName.trim(),
        event: eventName.trim(),
        tags: [],
        team: '',
      };

      AccountStorageMutation.mutate({
        actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
        collection: 'neondb',
        accountId: accountId,
        documentId: 'boards',
        document: boards,
      })
        .then(res => {
          AccountStorageMutation.mutate({
            actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
            collection: 'neondb-' + id,
            accountId: accountId,
            documentId: 'data',
            document: {},
          });
        })
        .catch(err => {
          Toast.showToast({
            title: 'Unable to save board',
            description: err.message || '',
            type: Toast.TYPE.CRITICAL,
          });
        })
        .finally(() => this.setState({ modalHidden: true }));
    }
  }

  deleteBoard(boardId) {
    const { boardName, eventName } = this.state;
    const { boards, accountId } = this.props;

    delete boards[boardId];

    AccountStorageMutation.mutate({
      actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: 'neondb',
      accountId: accountId,
      documentId: 'boards',
      document: boards,
    })
      .then(res => {
        AccountStorageMutation.mutate({
          actionType: AccountStorageMutation.ACTION_TYPE.DELETE_COLLECTION,
          collection: 'neondb-' + boardId,
          accountId: accountId,
        });
      })
      .catch(err => {
        Toast.showToast({
          title: 'Unable to delete board',
          description: err.message || '',
          type: Toast.TYPE.CRITICAL,
        });
      })
      .finally(() => this.setState({ boards: boards }));
  }

  // From https://gist.github.com/LeverOne/1308368
  generateUUID(a, b) {
    for (
      b = a = '';
      a++ < 36;
      b +=
        (a * 51) & 52
          ? (a ^ 15 ? 8 ^ (Math.random() * (a ^ 20 ? 16 : 4)) : 4).toString(16)
          : '-'
    );
    return b;
  }

  render() {
    const { modalHidden, boardName, eventName, events } = this.state;
    const { boards } = this.props;

    return (
      <div>
        <section className="board_list">
          {Object.keys(boards).map(boardId => (
            <article className="board_card" key={boardId}>
              <Tooltip className="board_delete" text="Delete this board">
                <a href="#" onClick={() => this.deleteBoard(boardId)}>
                  <Icon
                    sizeType={Icon.SIZE_TYPE.LARGE}
                    type={Icon.TYPE.INTERFACE__OPERATIONS__REMOVE__V_ALTERNATE}
                  />
                </a>
              </Tooltip>
              <a href="#" onClick={e => this.boardClicked(e, boardId)}>
                <h2 className="board_name">{boards[boardId].name}</h2>
                <span className="board_team">{boards[boardId].team || ''}</span>
              </a>
            </article>
          ))}
          <article className="board_card">
            <a href="#" onClick={e => this.showAddBoardModal(e)}>
              <Icon
                type={Icon.TYPE.INTERFACE__SIGN__PLUS}
                sizeType={Icon.SIZE_TYPE.LARGE}
                style={{ transform: 'scale(6)' }}
              />
            </a>
          </article>
        </section>
        <Modal hidden={modalHidden} onClose={this.closeModal}>
          <h3>Add Board</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gridGap: '1em',
            }}
          >
            <TextField
              label="Board Name"
              placeholder=""
              onChange={e => this.textUpdated(e, 'board')}
              value={boardName || ''}
            />
            <ComboBox
              title="Event"
              placeholder="event to monitor"
              value={eventName || ''}
              options={events}
              onChange={val => this.eventUpdated(val)}
            />
            <Button
              iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
              onClick={this.addBoard}
            >
              Add
            </Button>
          </div>
        </Modal>
      </div>
    );
  }
}
