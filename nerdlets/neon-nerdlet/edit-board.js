import React from 'react';
import PropTypes from 'prop-types';
import Title from './title';

import { Tabs, TabsItem } from 'nr1';

export default class EditBoard extends React.Component {
  static propTypes = {
    rows: PropTypes.array,
    cols: PropTypes.array,
    cells: PropTypes.array,
    onDataDelete: PropTypes.func,
    onDataSave: PropTypes.func,
  };

  constructor(props) {
    super(props);
  }

  render() {
    console.log('cell type', cells);
    const { rows, cols, cells, onDataDelete, onDataSave } = this.props;

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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridGap: '1em',
                marginTop: '2em',
              }}
            >
              {/* Use board admin select rowforcell, colforcell */}
              {cells.map((cell, i) => (
                <Title
                  key={i}
                  title={cell}
                  index={i}
                  type={'cells'}
                  onDataDelete={onDataDelete}
                  onDataSave={onDataSave}
                />
              ))}
            </div>
          </TabsItem>
        </Tabs>
      </div>
    );
  }
}
