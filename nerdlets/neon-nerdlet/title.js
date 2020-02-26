import React from 'react';
import PropTypes from 'prop-types';

import { TextField, Button } from 'nr1';

export default class Title extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    onDataDelete: PropTypes.func,
    onDataSave: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      editMode: false,
      value: '',
    };

    this.toggleEdit = this.toggleEdit.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
  }

  toggleEdit() {
    // referenced this https://codepen.io/saoirsezee/pen/yOrVras
    const { editMode } = this.state;
    this.setState({ editMode: !editMode });
  }

  handleEdit(e) {
    this.setState({ value: e.target.value });
  }

  render() {
    const { title, onDataDelete, onDataSave } = this.props;

    const { editMode, value } = this.state;

    return (
      <div>
        {editMode ? (
          <div>
            <TextField
              style={{ backgroundColor: '#f4f5f5' }}
              onChange={this.handleEdit}
              value={value}
            />
            <Button
              iconType={Button.ICON_TYPE.INTERFACE__SIGN__CHECKMARK}
              sizeType={Button.SIZE_TYPE.MEDIUM}
              type={Button.TYPE.PRIMARY}
              onClick={() => onDataSave(title)}
            >
              Save
            </Button>
            <Button
              iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__UNDO}
              sizeType={Button.SIZE_TYPE.MEDIUM}
              type={Button.TYPE.NEUTRAL}
              onClick={this.toggleEdit}
            >
              Cancel
            </Button>
            <Button
              iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__TRASH}
              sizeType={Button.SIZE_TYPE.MEDIUM}
              type={Button.TYPE.DESTRUCTIVE}
              onClick={() => onDataDelete(title)}
            >
              Delete
            </Button>
          </div>
        ) : (
          <div>
            <TextField value={title} disabled={false} />
            <Button
              iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT}
              sizeType={Button.SIZE_TYPE.MEDIUM}
              onClick={this.toggleEdit}
            >
              Edit
            </Button>
          </div>
        )}
      </div>
    );
  }
}
