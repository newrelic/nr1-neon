import React from 'react';
import PropTypes from 'prop-types';
import EditTitle from './edit-title';

import { Tabs, TabsItem } from 'nr1';

export default class EditBoard extends React.Component {
  static propTypes = {
    rows: PropTypes.array,
    cols: PropTypes.array,
  };

  constructor(props) {
    super(props);

    // this.state = {
    //   rowName: '',
    //   rowForCell: '',
    //   colName: '',
    //   colForCell: '',
    //   cells: [],
    //   cellType: '',
    //   policyName: '',
    //   attributeName: '',
    //   isType: '',
    // };
  }

  render() {
    // const {
    //   rowName,
    //   rowForCell,
    //   colName,
    //   colForCell,
    //   cellType,
    //   policyName,
    //   attributeName,
    //   isType,
    // } = this.state;
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
              <EditTitle rows={rows} />
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
                <EditTitle cols={cols} />
              </div>
            </div>
          </TabsItem>
        </Tabs>
      </div>
    );
  }
}
