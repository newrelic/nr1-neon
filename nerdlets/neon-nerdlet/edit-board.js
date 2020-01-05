import React from 'react';
import PropTypes from 'prop-types';

import { Tabs, TabsItem, TextField, Button, Grid, GridItem } from 'nr1';

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
      editIndex: -1,
      value: '',
    };

    this.changeHandler = this.changeHandler.bind(this);
    this.updateData = this.updateData.bind(this);
    // this.cancelUpdate = this.cancelUpdate.bind(this);
    this.deleteData = this.deleteData.bind(this);
    // this.optionChange = this.optionChange.bind(this);
    this.persistData = this.persistData.bind(this);
  }

  changeHandler(e) {
    // const o = {};
    // o[type] = e.target.value;
    // this.setState(o);
    this.setState({ value: e.target.value });
  }

  // optionChange(val, type) {
  //   const o = {};
  //   o[type + 'Type'] = val;
  //   this.setState(o);
  // }

  persistData(rows, cols, cells) {
    const { onSave } = this.props;
    if (onSave) onSave(rows, cols, cells);
  }

  updateData(e, type, i) {
    e.preventDefault();
    console.log(type, i);
    const { rowName, colName } = this.state;
    const { rows, cols, cells } = this.props;
    if (type === 'row') {
      this.setState(
        {
          rows: rows,
          rowName: rows[i],
          editIndex: i,
        },
        this.persistData(rows, cols, cells)
      );
    }
  }

  // cancelUpdate(e, type, i) {
  //   e.preventDefault();
  //   const { rows, rowName, cols, colName } = this.state;
  //   this.setState({ rowName: rows[i] });
  //   console.log('clicked cancel', rowName);
  // }

  deleteData(e, type, i) {
    e.preventDefault();
    const { rows, cols, cells } = this.props;
    if (type === 'row') {
      rows.splice(i, 1);
    } else {
      cols.splice(i, 1);
    }
    this.setState(
      {
        rows: rows,
        rowName: '',
        cols: cols,
        colName: '',
      },
      this.persistData(rows, cols, cells)
    );
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
      value,
    } = this.state;
    const { rows, cols, cells } = this.props;

    return (
      <div>
        <h3>Edit Board Titles</h3>
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
              <div>
                {rows.map((row, i) => (
                  <div key={i}>
                    <TextField
                      label="Title"
                      placeholder={rowName}
                      onChange={this.changeHandler}
                      value={value}
                    />
                    <Button
                      iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT}
                      onClick={e => this.updateData(e, 'row', i)}
                    >
                      Update
                    </Button>
                    <Button
                      type={Button.TYPE.DESTRUCTIVE}
                      iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__TRASH}
                      // onClick={e => this.cancelUpdate(e, 'row', i)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type={Button.TYPE.DESTRUCTIVE}
                      iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__TRASH}
                      onClick={e => this.deleteData(e, 'row', i)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
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
              <div>
                {cols.map((col, i) => (
                  <Grid key={i}>
                    <GridItem columnSpan={4}>
                      <div>{col}</div>
                    </GridItem>
                    <GridItem columnSpan={4}>
                      <Button
                        iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT}
                        // onClick={e => this.updateData(e, 'col', i)}
                      >
                        Edit
                      </Button>
                    </GridItem>
                    <GridItem columnSpan={4}>
                      <Button
                        iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT}
                        // onClick={e => this.saveEdit(e, 'col', i)}
                      >
                        Save
                      </Button>
                    </GridItem>
                  </Grid>
                ))}
              </div>
            </div>
          </TabsItem>
        </Tabs>
      </div>
    );
  }
}
