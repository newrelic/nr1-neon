import React from 'react';
import {
  Dropdown,
  DropdownItem,
  Modal,
  Button,
  HeadingText,
  BlockText,
  Link,
} from 'nr1';

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
            <a href="#dependencies" onClick={e => this.openHelp(e)}>
              Dependencies
            </a>
          </DropdownItem>
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
            <HeadingText type={HeadingText.TYPE.HEADING_3}>
              Getting Started With Neon
            </HeadingText>
            <h3 id="dependencies">Dependencies</h3>
            <BlockText type={BlockText.TYPE.PARAGRAPH}>
              You need to have New Relic Alerts and a webhook notification
              channel set up. Instructions for webhook setup is{' '}
              <Link to="https://github.com/glitton/nr1-neon/blob/documentation/docs/alert_webhook_config.md">
                here.
              </Link>
            </BlockText>
            <h3 id="create_new_board">Create A New Board</h3>
            <BlockText type={BlockText.TYPE.PARAGRAPH}>
              <li>Click the plus icon (+)</li>
              <li>
                In the <strong>BOARD NAME</strong> text field, type in a name
                for your board
              </li>
              <li>Click the plus icon (+)</li>
            </BlockText>
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
