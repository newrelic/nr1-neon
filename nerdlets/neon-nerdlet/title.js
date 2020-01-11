import React from 'react';
import PropTypes from 'prop-types';

import { TextField, Button } from 'nr1';

export default class Title extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    onClose: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      editMode: false,
      value: '',
    };

    this.toggleEdit = this.toggleEdit.bind(this);
    this.handleChange = this.handleChange.bind(this);
    // this.persistData = this.persistData.bind(this);
  }

  // persistData(rows, cols, cells) {
  //   const { onSave } = this.props;
  //   if (onSave) onSave(rows, cols, cells);
  // }

  toggleEdit() {
    const { editMode } = this.state;
    this.setState({ editMode: !editMode });
    // reference this https://codepen.io/saoirsezee/pen/yOrVra
  }

  handleChange(e) {
    this.setState({ value: e.target.value });
  }

  render() {
    const { title } = this.props;
    const { editMode, value } = this.state;

    return (
      <div>
        {editMode ? (
          <div>
            <TextField onChange={this.handleChange} value={value} />
            <Button
              iconType={Button.ICON_TYPE.INTERFACE__SIGN__CHECKMARK}
              sizeType={Button.SIZE_TYPE.MEDIUM}
              type={Button.TYPE.PRIMARY}
              // onClick={this.handleSave}
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
