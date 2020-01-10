import React from 'react';
import PropTypes from 'prop-types';
import Title from './title';

import { Tabs, TabsItem } from 'nr1';

export default class EditBoard extends React.Component {
  static propTypes = {
    rows: PropTypes.array,
    cols: PropTypes.array,
  };

  constructor(props) {
    super(props);
  }

  render() {
    const { rows, cols } = this.props;

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
              {rows.map((row, i) => (
                <Title key={i} title={row} />
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
                <Title key={i} title={col} />
              ))}
            </div>
          </TabsItem>
        </Tabs>
      </div>
    );
  }
}
