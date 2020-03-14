import React from 'react';
import { Dropdown, DropdownItem, Modal, Button } from 'nr1';

export default class Help extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      newBoardModalHidden: true,
    };
    this._onClose = this._onClose.bind(this);
    this.openHelp = this.openHelp.bind(this);
  }

  _onClose() {
    this.setState({ newBoardModalHidden: true });
  }

  openHelp(e) {
    e.preventDefault();
    this.setState({ newBoardModalHidden: false });
  }

  render() {
    const { newBoardModalHidden } = this.state;
    return (
      <div>
        <Dropdown title="Getting Started">
          <DropdownItem>
            <a href="#create_new_board" onClick={e => this.openHelp(e)}>
              Create a New Board
            </a>
          </DropdownItem>
          <DropdownItem>
            <a href="#set_up_board" onClick={e => this.openHelp(e)}>
              Set Up Board
            </a>
          </DropdownItem>
          <DropdownItem>
            <a href="#view_boards" onClick={e => this.openHelp(e)}>
              View Boards
            </a>
          </DropdownItem>
          <DropdownItem>
            <a href="#edit_board" onClick={e => this.openHelp(e)}>
              Edit Board
            </a>
          </DropdownItem>
          <DropdownItem>
            <a href="#delete_board" onClick={e => this.openHelp(e)}>
              Delete Board
            </a>
          </DropdownItem>
        </Dropdown>

        <Modal hidden={newBoardModalHidden} onClose={this._onClose}>
          <div>
            <h1>Getting Started</h1>
            <h3 id="create_new_board">Create A New Board</h3>
            <h3 id="set_up_board">Set Up Board</h3>
            <h3 id="view_boards">View Boards</h3>
            <h3 id="edit_board">Edit Board</h3>
            <h3 id="delete_board">Delete Board</h3>
            <Button onClick={this._onClose}>Close</Button>
          </div>
        </Modal>
      </div>
    );
  }
}
