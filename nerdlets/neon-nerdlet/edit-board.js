import React from 'react';
import PropTypes from 'prop-types';
import Title from './title';
import Cell from './edit-cell';

import { Tabs, TabsItem, Button } from 'nr1';

export default class EditBoard extends React.Component {
  static propTypes = {
    rows: PropTypes.array,
    rowForCell: PropTypes.string,
    cols: PropTypes.array,
    colForCell: PropTypes.string,
    cells: PropTypes.array,
    cellType: PropTypes.string,
    onDataDelete: PropTypes.func,
    onDataSave: PropTypes.func,
  };

  constructor(props) {
    super(props);
  }

  render() {
    // console.log('cell type', cells);
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
      <div>
        <h3>Edit Board</h3>
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
              {rows.map((row, i) => (
                <Title
                  key={i}
                  title={row}
                  index={i}
                  type={'rows'}
                  onDataDelete={onDataDelete}
                  onDataSave={onDataSave}
                />
              ))}
            </div>
          </TabsItem>
          <TabsItem value="tab-cols" label="Cols">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridGap: '1em',
                marginTop: '2em',
              }}
            >
              {cols.map((col, i) => (
                <Title
                  key={i}
                  title={col}
                  index={i}
                  type={'cols'}
                  onDataDelete={onDataDelete}
                  onDataSave={onDataSave}
                />
              ))}
            </div>
          </TabsItem>
          <TabsItem value="tab-cells" label="Cells">
            <Cell
              rows={rows}
              rowForCell={rowForCell}
              cols={cols}
              colForCell={colForCell}
              cells={cells}
              cellType={cellType}
            />
          </TabsItem>
        </Tabs>
      </div>
    );
  }
}
