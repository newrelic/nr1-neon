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
      editMode: false,
    };

    this.toggleEdit = this.toggleEdit.bind(this);
    this.persistData = this.persistData.bind(this);
  }

  persistData(rows, cols, cells) {
    const { onSave } = this.props;
    if (onSave) onSave(rows, cols, cells);
  }

  toggleEdit(row) {
    const { editMode } = this.state;
    console.log(row);
    this.setState({ editMode: !editMode });
    // reference this https://codepen.io/saoirsezee/pen/yOrVra
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
      editMode,
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
              {editMode ? (
                <div>
                  {rows.map((row, i) => (
                    <div key={i}>
                      <TextField label="Title" value={row} />
                      <Button
                        iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT}
                        onClick={() => this.toggleEdit(row)}
                      >
                        Done
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {rows.map((row, i) => (
                    <div key={i}>
                      <TextField label="Title" value={row} />

                      <Button
                        iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT}
                        onClick={() => this.toggleEdit(row)}
                      >
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
                      >
                        Edit
                      </Button>
                    </GridItem>
                    <GridItem columnSpan={4}>
                      <Button
                        iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT}
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
