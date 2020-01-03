import React from 'react';
import PropTypes from 'prop-types';

import { Icon, Modal, Tabs, TabsItem, TextField, Button } from 'nr1';

export default class EditBoard extends React.Component {
  static propTypes = {
    rows: PropTypes.array,
    cols: PropTypes.array,
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
      editMode: false,
    };

    // this.changeHandler = this.changeHandler.bind(this);
    // this.optionChange = this.optionChange.bind(this);
    this.editData = this.editData.bind(this);
    // this.persistData = this.persistData.bind(this);
  }

  // changeHandler(e, type) {
  //   const o = {};
  //   o[type] = e.target.value;
  //   this.setState(o);
  // }

  // optionChange(val, type) {
  //   const o = {};
  //   o[type + 'Type'] = val;
  //   this.setState(o);
  // }

  editData(type) {
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
        <h3>Edit Board Details</h3>
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
                type={Button.TYPE.PRIMARY}
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
                type={Button.TYPE.PRIMARY}
                iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
                onClick={() => this.addData('col')}
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
