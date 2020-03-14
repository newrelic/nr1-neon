import React from 'react';
import { Dropdown, DropdownItem, Modal, Button } from 'nr1';

export default class Help extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      newBoardModalHidden: true,
    };
    this._onClose = this._onClose.bind(this);
    this.openCreateNewBoard = this.openCreateNewBoard.bind(this);
  }

  _onClose() {
    this.setState({ newBoardModalHidden: true });
  }

  openCreateNewBoard(e) {
    e.preventDefault();
    this.setState({ newBoardModalHidden: false });
  }

  render() {
    const { newBoardModalHidden } = this.state;
    return (
      <div>
        <Dropdown title="Getting Started">
          <DropdownItem>
            <a href="#" onClick={e => this.openCreateNewBoard(e)}>
              Create a New Board
            </a>
          </DropdownItem>
          <DropdownItem>Set Up Board</DropdownItem>
          <DropdownItem>View Boards</DropdownItem>
          <DropdownItem>Edit Board</DropdownItem>
          <DropdownItem>Delete Board</DropdownItem>
        </Dropdown>

        <Modal hidden={newBoardModalHidden} onClose={this._onClose}>
          <div>
            Create A New Board
            <Button onClick={this._onClose}>Close</Button>
          </div>
        </Modal>
      </div>
    );
  }
}
