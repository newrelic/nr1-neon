import React from 'react';
import PropTypes from 'prop-types';

import { Button } from 'nr1';

export default class Cell extends React.Component {
  static propTypes = {
    rows: PropTypes.array,
    rowForCell: PropTypes.string,
    cols: PropTypes.array,
    colForCell: PropTypes.string,
    cells: PropTypes.array,
    cellType: PropTypes.string,
    // onDataDelete: PropTypes.func,
    // onDataSave: PropTypes.func,
  };

  constructor(props) {
    super(props);
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
      rows,
      rowForCell,
      cols,
      colForCell,
      cells,
      cellType,
      onDataDelete,
      onDataSave,
    } = this.props;

    return (
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
          type={Button.TYPE.PRIMARY}
          iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
          onClick={() => this.addData('cell')}
        >
          Edit
        </Button>
      </div>
    );
  }
}
