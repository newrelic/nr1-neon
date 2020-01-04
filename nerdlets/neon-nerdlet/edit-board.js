import React from 'react';
import PropTypes from 'prop-types';

import {
  Icon,
  Tabs,
  TabsItem,
  TextField,
  Button,
  Grid,
  GridItem,
  Tooltip,
} from 'nr1';

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
      editIndex: -1,
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

  editData(e, type, i) {
    e.preventDefault();
    const { rowName, colName } = this.state;
    const { rows, cols, cells } = this.props;
    if (type === 'row') {
      this.setState({
        rows: rows,
        rowName: '',
        editIndex: i,
        editMode: true,
      });
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
                  <Grid key={i}>
                    <GridItem columnSpan={4}>
                      <TextField defaultValue={row}></TextField>
                    </GridItem>
                    <GridItem columnSpan={4}>
                      <Button
                        iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT}
                        onClick={e => this.editData(e, 'row', i)}
                      >
                        Edit
                      </Button>
                    </GridItem>
                    <GridItem columnSpan={4}>
                      <Button onClick={e => this.saveEdit(e, 'row', i)}>
                        Done
                      </Button>
                    </GridItem>
                  </Grid>
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
                        onClick={e => this.editData(e, 'col', i)}
                      >
                        Edit
                      </Button>
                    </GridItem>
                    <GridItem columnSpan={4}>
                      <Button
                        iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT}
                        onClick={e => this.saveEdit(e, 'col', i)}
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
