import React from 'react';
import PropTypes from 'prop-types';

import { TextField, Button } from 'nr1';

export default class Title extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    index: PropTypes.number,
    type: PropTypes.string,
    onDataDelete: PropTypes.func,
    onDataSave: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      editMode: false,
      value: props.title || '',
    };

    this.toggleEdit = this.toggleEdit.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }

  toggleEdit(e) {
    e.preventDefault();
    const { editMode } = this.state;
    this.setState({ editMode: !editMode });
  }

  handleEdit(e) {
    this.setState({ value: e.target.value });
  }

  handleCancel(e) {
    e.preventDefault();
    this.setState({ editMode: false });
  }

  render() {
    const { title, index, onDataDelete, onDataSave, type } = this.props;
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
              className="btn-spacing"
              iconType={Button.ICON_TYPE.INTERFACE__SIGN__CHECKMARK}
              sizeType={Button.SIZE_TYPE.MEDIUM}
              type={Button.TYPE.PRIMARY}
              onClick={() => onDataSave(value, index, type)}
            >
              Save
            </Button>
            <Button
              className="btn-spacing"
              iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__UNDO}
              sizeType={Button.SIZE_TYPE.MEDIUM}
              type={Button.TYPE.NEUTRAL}
              onClick={this.handleCancel}
            >
              Cancel
            </Button>
            <Button
              className="btn-spacing"
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
              className="btn-spacing"
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
