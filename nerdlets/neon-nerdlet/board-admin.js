import React from 'react';
import PropTypes from 'prop-types';

import { Icon, Modal, Tabs, TabsItem, TextField, Button } from 'nr1';

export default class BoardAdmin extends React.Component {
  static propTypes = {
    rows: PropTypes.array,
    cols: PropTypes.array,
    cells: PropTypes.array,
    onSave: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      rowName: '',
      rowForCell: '',
      colName: '',
      colForCell: '',
      cells: [],
      cellType: '',
      policyName: '',
      attributeName: '',
      isType: '',
      valueName: '',
    };

    this.changeHandler = this.changeHandler.bind(this);
    this.optionChange = this.optionChange.bind(this);
    this.addData = this.addData.bind(this);
    this.persistData = this.persistData.bind(this);
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

  addData(type) {
    const {
      rowName,
      rowForCell,
      colName,
      colForCell,
      cellType,
      policyName,
      attributeName,
      isType,
      valueName,
    } = this.state;
    const { rows, cols, cells } = this.props;

    if (type === 'row') {
      if (rows.filter(r => r === rowName).length) return;
      rows.push(rowName);
      this.setState(
        {
          rows: rows,
          rowName: '',
        },
        this.persistData(rows, cols, cells)
      );
    } else if (type === 'col') {
      if (cols.filter(c => c === colName).length) return;
      cols.push(colName);
      this.setState(
        {
          cols: cols,
          colName: '',
        },
        this.persistData(rows, cols, cells)
      );
    } else if (type === 'cell') {
      if (
        cells.reduce(
          (a, c) => a || (c.row === rowForCell && c.col === colForCell),
          false
        )
      )
        return;
      if (cellType === 'alert') {
        if (!policyName) return;
        cells.push({
          row: rowForCell,
          col: colForCell,
          policy: policyName,
        });
      } else if (cellType === 'data') {
        if (!attributeName) return;
        const deets = {};
        const attr = attributeName.split(/ as /i);
        if (attr.length === 2) deets.name = attr[1].replace(/[^\w]/gi, '');
        if (attr.length === 1 || attr.length === 2) {
          const attrParts = attr[0].split('(');
          deets.key = (attrParts[1] || attrParts[0]).replace(/[^\w]/gi, '');
          deets.func =
            attrParts.length === 2
              ? attrParts[0].replace(/[^\w]/gi, '')
              : 'latest';
        }
        if (!('name' in deets)) deets.name = deets.func + '_' + deets.key;
        deets.str = deets.func + '(`' + deets.key + '`)' + ' AS ' + deets.name;
        deets.is = isType;
        deets.value = valueName;
        cells.push({
          row: rowForCell,
          col: colForCell,
          attribute: attributeName,
          details: deets,
        });
      }
      this.setState(
        {
          cells: cells,
          rowForCell: '',
          colForCell: '',
          cellType: '',
          policyName: '',
          attributeName: '',
          isType: '',
          valueName: '',
        },
        this.persistData(rows, cols, cells)
      );
    }
  }

  persistData(rows, cols, cells) {
    const { onSave } = this.props;
    if (onSave) onSave(rows, cols, cells);
  }

  render() {
    const {
      rowName,
      rowForCell,
      colName,
      colForCell,
      cellType,
      policyName,
      attributeName,
      isType,
      valueName,
    } = this.state;
    const { rows, cols, cells } = this.props;

    return (
      <div>
        <h3>Board Details</h3>
        <Tabs>
          <TabsItem value="tab-rows" label="Rows">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridGap: '1em',
                marginTop: '2em',
              }}
            >
              <TextField
                label="Title"
                placeholder=""
                onChange={e => this.changeHandler(e, 'rowName')}
                value={rowName}
              />
              <Button
                iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
                onClick={() => this.addData('row')}
              >
                Add
              </Button>
            </div>
          </TabsItem>
          <TabsItem value="tab-cols" label="Columns">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridGap: '1em',
                marginTop: '2em',
              }}
            >
              <TextField
                label="Title"
                placeholder=""
                onChange={e => this.changeHandler(e, 'colName')}
                value={colName}
              />
              <Button
                iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
                onClick={() => this.addData('col')}
              >
                Add
              </Button>
            </div>
          </TabsItem>
          <TabsItem value="tab-cells" label="Cells">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridGap: '1em',
                marginTop: '2em',
              }}
            >
              <select
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
                      style={{ alignSelf: 'end' }}
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
                iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
                onClick={() => this.addData('cell')}
              >
                Add
              </Button>
            </div>
          </TabsItem>
        </Tabs>
      </div>
    );
  }
}
