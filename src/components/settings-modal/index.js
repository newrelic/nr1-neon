import React, { useCallback, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import {
  AutoSizer,
  Button,
  DataTable,
  DataTableBody,
  DataTableEntityRowCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableRow,
  HeadingText,
  useEntitySearchQuery,
} from 'nr1';
import { FilterBar } from '@newrelic/nr-labs-components';

import Modal from '../modal';
import { AppContext } from '../../contexts';
import { filtersArrayToNrql, keyValuesFromEntities } from '../../utils';

const WORKLOAD_FILTER = "domain = 'NR1' AND type = 'WORKLOAD'";

const SettingsModal = ({
  onSave,
  isSettingsModalOpen,
  setIsSettingsModalOpen,
}) => {
  const [filterOptions, setFilterOptions] = useState([
    { option: 'name', type: 'string', values: [] },
  ]);
  const [selection, setSelection] = React.useState({});
  const [entitySearchFilter, setEntitySearchFilter] = useState(WORKLOAD_FILTER);
  const { account, accounts } = useContext(AppContext);
  const {
    data: { count = 0, entities = [] } = {},
    error: entitiesError,
    fetchMore,
  } = useEntitySearchQuery({
    filters: entitySearchFilter,
    includeTags: true,
  });

  const filterWorkloads = useCallback((selectedFilters) => {
    const filtersStr = filtersArrayToNrql(selectedFilters);
    const esf = filtersStr
      ? `${WORKLOAD_FILTER} AND ${filtersStr}`
      : WORKLOAD_FILTER;
    setEntitySearchFilter(esf);
  }, []);

  const closeHandler = useCallback(() => {
    setIsSettingsModalOpen?.(false);
  }, []);

  useEffect(() => {
    setFilterOptions((fo) => {
      const updatedFO = fo?.filter((f) => f.option !== 'account');
      return [
        ...updatedFO,
        {
          option: 'account',
          type: 'numeric',
          values: accounts?.map(({ id, name }) => ({ id, value: name })),
        },
      ];
    });
  }, [account, accounts]);

  useEffect(
    () =>
      setFilterOptions((existingOptions) =>
        keyValuesFromEntities(entities, existingOptions)
      ),
    [entities]
  );

  useEffect(
    () => console.error('Error fetching entities', entitiesError),
    [entitiesError]
  );

  return (
    <Modal hidden={!isSettingsModalOpen} onClose={closeHandler}>
      <div className="settings-modal">
        <HeadingText type={HeadingText.TYPE.HEADING_3}>Settings</HeadingText>
        <div className="filter-bar">
          <FilterBar options={filterOptions} onChange={filterWorkloads} />
        </div>
        <div className="workloads-table">
          <AutoSizer>
            {({ height }) => (
              <DataTable
                ariaLabel="Workloads"
                itemCount={count || 0}
                items={entities || []}
                height={height}
                selectionType={DataTable.SELECTION_TYPE.MULTIPLE}
                selection={selection}
                onSelectionChange={setSelection}
                onLoadMoreItems={fetchMore}
              >
                <DataTableHeader>
                  <DataTableHeaderCell name="name" value="name">
                    Workload Name
                  </DataTableHeaderCell>
                </DataTableHeader>
                <DataTableBody>
                  {({ item }) => (
                    <DataTableRow>
                      <DataTableEntityRowCell
                        alertSeverity={item.alertSeverity}
                        reporting={item.reporting}
                      />
                    </DataTableRow>
                  )}
                </DataTableBody>
              </DataTable>
            )}
          </AutoSizer>
        </div>
        <div className="buttons-bar">
          <Button onClick={closeHandler}> Cancel </Button>
          <Button
            type={Button.TYPE.PRIMARY}
            onClick={() =>
              onSave?.(entities.filter((_, i) => selection[i] === true))
            }
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

SettingsModal.propTypes = {
  onSave: PropTypes.func,
  isSettingsModalOpen: PropTypes.bool,
  setIsSettingsModalOpen: PropTypes.func,
};

export default SettingsModal;
