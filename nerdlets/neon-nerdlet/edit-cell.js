import React from 'react';
import PropTypes from 'prop-types';

import { Button, TextField } from 'nr1';

export default class Cell extends React.Component {
  static propTypes = {
    rows: PropTypes.array,
    cols: PropTypes.array,
    cells: PropTypes.array,
    onDataSave: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      rowForCell: '',
      colForCell: '',
      cells: [],
      cellType: '',
      policyName: '',
      attributeName: '',
      isType: '',
      valueName: '',
      editMode: false,
      value: '',
    };

    this.toggleEdit = this.toggleEdit.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.changeHandler = this.changeHandler.bind(this);
    this.optionChange = this.optionChange.bind(this);
  }

  componentDidUpdate(_prevProps, prevState) {
    const { rowForCell, colForCell } = this.state;
    const { cells } = this.props;

    // only want to update default type if these values have changed
    if (
      prevState.rowForCell === rowForCell &&
      prevState.colForCell === colForCell
    )
      return;

    // can only find cell if row and col defined
    if (!rowForCell || !colForCell) return;

    const selectedCell = cells.find(
      ({ col, row }) => col === colForCell && row === rowForCell
    );

    if (selectedCell) {
      const { policy, attribute, details } = selectedCell;

      console.log('CELL', selectedCell);

      this.setState({
        cellType: policy ? 'alert' : 'data',
        policyName: policy || '',
        attributeName: attribute || '',
        value: details?.value || '',
        valueName: details?.value || '',
        isType: details?.is || '',
      });
    }
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

  changeHandler(e, type) {
    const o = {};
    o[type] = e.target.value;
    this.setState(o);
  }

  optionChange(val, type) {
    const o = {};
    o[type + 'Type'] = val;
    this.setState(o);
  }

  // TODO: Make edit with pencil, enable when user clicks, add save
  render() {
    const selectStyle = {
      minWidth: '128px',
      minHeight: '33px',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      padding: '6.5px 8px',
      fontSize: '14px',
      position: 'relative',
      lineHeight: '19px',
      border: 'none',
      boxShadow:
        'inset 0 0 0 1px #d5d7d7, inset 0px 3px 0px rgba(0, 0, 0, 0.02)',
      backgroundPosition: 'right 8px top 56%',
      borderRadius: '3px',
      backgroundColor: '#fff',
      transition: '0.075s all ease-in-out',
      left: 0,
    };

    const {
      rowForCell,
      colForCell,
      cellType,
      policyName,
      attributeName,
      isType,
      valueName,
      value,
      editMode,
    } = this.state;
    const { rows, cols, cells } = this.props;

    return (
      <div>
        {editMode ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gridGap: '1em',
              marginTop: '2em',
            }}
          >
            <select
              style={selectStyle}
              value={rowForCell || ''}
              onChange={e => this.changeHandler(e, 'rowForCell')}
            >
              <option value="">SELECT A ROW</option>
              {rows.map((r, i) => (
                <option value={r} key={i}>
                  {r}
                </option>
              ))}
            </select>
            <select
              style={selectStyle}
              value={colForCell || ''}
              onChange={e => this.changeHandler(e, 'colForCell')}
            >
              <option value="">SELECT A COLUMN</option>
              {cols.map((c, i) => (
                <option value={c} key={i}>
                  {c}
                </option>
              ))}
            </select>
            <select
              style={selectStyle}
              value={cellType || ''}
              onChange={e => this.changeHandler(e, 'cellType')}
            >
              <option value="">SELECT DATA TYPE</option>
              <option value="alert">New Relic Alert</option>
              <option value="data">New Relic Attribute</option>
            </select>
            {cellType === 'alert' && (
              <TextField
                label="Alert Policy"
                placeholder=""
                onChange={e => this.changeHandler(e, 'policyName')}
                value={policyName}
              />
            )}
            {cellType === 'data' && (
              <div>
                <TextField
                  label="Attribute Name"
                  placeholder=""
                  onChange={e => this.changeHandler(e, 'attributeName')}
                  value={attributeName}
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 1fr',
                    gridGap: '.5em',
                    marginTop: '.75em',
                  }}
                >
                  <select
                    value={isType || ''}
                    onChange={e => this.changeHandler(e, 'isType')}
                    style={{ alignSelf: 'end', ...selectStyle }}
                  >
                    <option value="">COMPARISON</option>
                    <option value="less">less than</option>
                    <option value="equal">equals</option>
                    <option value="more">greater than</option>
                  </select>
                  <TextField
                    label="Value"
                    placeholder=""
                    onChange={e => this.changeHandler(e, 'valueName')}
                    value={valueName}
                  />
                </div>
              </div>
            )}
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
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gridGap: '1em',
              marginTop: '2em',
            }}
          >
            <select style={selectStyle} disabled>
              <option value="">SELECT A ROW</option>
            </select>
            <select style={selectStyle} disabled>
              <option value="">SELECT A COLUMN</option>
            </select>
            <select style={selectStyle} disabled>
              <option value="">SELECT DATA TYPE</option>
              <option value="alert">New Relic Alert</option>
              <option value="data">New Relic Attribute</option>
            </select>
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
