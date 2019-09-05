import React from 'react';
import PropTypes from 'prop-types';

import { Icon, Modal, Tabs, TabsItem, TextField, Button } from 'nr1';

import Select from './select';
import SegmentedControl from './segmented-control';

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
      rowForCell: [],
      colName: '',
      colForCell: [],
      cells: [],
      cellType: '',
      policyName: '',
      attributeName: '',
      isType: '',
      valueName: '',
    };

    this.textUpdated = this.textUpdated.bind(this);
    this.cellSelect = this.cellSelect.bind(this);
    this.optionChange = this.optionChange.bind(this);
    this.addData = this.addData.bind(this);
    this.persistData = this.persistData.bind(this);
  }

  textUpdated(e, type) {
    const o = {};
    o[type + 'Name'] = e.target.value;
    this.setState(o);
  }

  cellSelect(val, type) {
    const o = {};
    o[type + 'ForCell'] = val;
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
          (a, c) => a || (c.row === rowForCell[0] && c.col === colForCell[0]),
          false
        )
      )
        return;
      if (cellType === 'alert') {
        if (!policyName) return;
        cells.push({
          row: rowForCell[0],
          col: colForCell[0],
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
          row: rowForCell[0],
          col: colForCell[0],
          attribute: attributeName,
          details: deets,
        });
      }
      this.setState(
        {
          cells: cells,
          rowForCell: [],
          colForCell: [],
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
          <TabsItem itemKey="tab-rows" label="Rows">
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
                onChange={e => this.textUpdated(e, 'row')}
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
          <TabsItem itemKey="tab-cols" label="Columns">
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
                onChange={e => this.textUpdated(e, 'col')}
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
          <TabsItem itemKey="tab-cells" label="Cells">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridGap: '1em',
                marginTop: '2em',
              }}
            >
              <Select
                label="Row"
                placeholder=""
                values={rowForCell || []}
                options={rows.map(r => ({ value: r }))}
                onChange={val => this.cellSelect(val, 'row')}
              />
              <Select
                label="Column"
                placeholder=""
                values={colForCell || []}
                options={cols.map(c => ({ value: c }))}
                onChange={val => this.cellSelect(val, 'col')}
              />
              <SegmentedControl
                title="cell"
                selected=""
                onChange={this.optionChange}
                options={[
                  { name: 'alert', value: 'NR Alert' },
                  { name: 'data', value: 'NR Data' },
                ]}
              />
              {cellType === 'alert' && (
                <TextField
                  label="Alert Policy"
                  placeholder=""
                  onChange={e => this.textUpdated(e, 'policy')}
                  value={policyName}
                />
              )}
              {cellType === 'data' && (
                <div>
                  <TextField
                    label="Attribute Name"
                    placeholder=""
                    onChange={e => this.textUpdated(e, 'attribute')}
                    value={attributeName}
                  />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '3fr 1fr',
                      gridGap: '.5em',
                      alignItems: 'center',
                    }}
                  >
                    <SegmentedControl
                      title="is"
                      selected=""
                      onChange={this.optionChange}
                      options={[
                        { name: 'less', value: 'less than' },
                        { name: 'equal', value: 'equals' },
                        { name: 'more', value: 'greater than' },
                      ]}
                    />
                    <TextField
                      label="Value"
                      placeholder=""
                      onChange={e => this.textUpdated(e, 'value')}
                      value={valueName}
                      style={{ marginBottom: '.75em' }}
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
