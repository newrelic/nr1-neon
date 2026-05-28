import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
  Switch,
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
  savedWorkloads = [],
  savedHideUnacknowledged = false,
}) => {
  const [filterOptions, setFilterOptions] = useState([
    { option: 'name', type: 'string', values: [] },
  ]);
  const [selectedGuids, setSelectedGuids] = useState(() => new Set());
  const [hideUnacknowledged, setHideUnacknowledged] = useState(
    savedHideUnacknowledged
  );
  const [entitySearchFilter, setEntitySearchFilter] = useState(WORKLOAD_FILTER);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { account, accounts } = useContext(AppContext);
  const {
    data: { count = 0, entities = [] } = {},
    error: entitiesError,
    fetchMore,
  } = useEntitySearchQuery({
    filters: entitySearchFilter,
    includeTags: true,
  });

  // Reset selection to saved state each time the modal opens.
  useEffect(() => {
    if (isSettingsModalOpen) {
      setSelectedGuids(new Set(savedWorkloads.map((w) => w.guid)));
      setHideUnacknowledged(savedHideUnacknowledged);
      setSaveError(null);
    }
  }, [isSettingsModalOpen]);

  const savedGuids = useMemo(
    () => new Set(savedWorkloads.map((w) => w.guid)),
    [savedWorkloads]
  );

  const entityByGuid = useMemo(
    () => new Map(entities.map((e) => [e.guid, e])),
    [entities]
  );

  const savedByGuid = useMemo(
    () => new Map(savedWorkloads.map((w) => [w.guid, w])),
    [savedWorkloads]
  );

  // Sort current result set: previously saved workloads that match the filter
  // float to top, rest alphabetical. Does not re-sort on user interaction.
  const sortedEntities = useMemo(() => {
    return [...entities].sort((a, b) => {
      const asaved = savedGuids.has(a.guid);
      const bsaved = savedGuids.has(b.guid);
      if (asaved !== bsaved) return asaved ? -1 : 1;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [entities, savedGuids]);

  // Index-based selection for DataTable, derived from selectedGuids.
  const selection = useMemo(() => {
    const s = {};
    sortedEntities.forEach((e, i) => {
      if (selectedGuids.has(e.guid)) s[i] = true;
    });
    return s;
  }, [sortedEntities, selectedGuids]);

  const handleSelectionChange = useCallback(
    (newIndexSelection) => {
      setSelectedGuids((prev) => {
        const next = new Set(prev);
        sortedEntities.forEach((e, i) => {
          if (newIndexSelection[i] === true) next.add(e.guid);
          else next.delete(e.guid);
        });
        return next;
      });
    },
    [sortedEntities]
  );

  // Right panel: all selected workloads, using full entity data where available.
  const selectedList = useMemo(
    () =>
      [...selectedGuids].map(
        (guid) =>
          entityByGuid.get(guid) ??
          savedByGuid.get(guid) ?? { guid, name: guid }
      ),
    [selectedGuids, entityByGuid, savedByGuid]
  );

  const removeFromSelection = useCallback((guid) => {
    setSelectedGuids((prev) => {
      const next = new Set(prev);
      next.delete(guid);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const toSave = [...selectedGuids]
      .map((guid) => {
        const e = entityByGuid.get(guid) ?? savedByGuid.get(guid);
        if (!e) return null;
        return {
          accountId: e.accountId ?? e.account?.id,
          guid: e.guid,
          name: e.name,
        };
      })
      .filter(Boolean);

    setSaveError(null);
    setIsSaving(true);
    try {
      const result = await onSave?.({ workloads: toSave, hideUnacknowledged });
      if (result?.error) {
        setSaveError(result.error);
        return;
      }
      setIsSettingsModalOpen?.(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedGuids,
    entityByGuid,
    savedByGuid,
    hideUnacknowledged,
    onSave,
    setIsSettingsModalOpen,
  ]);

  const filterWorkloads = useCallback((selectedFilters) => {
    const filtersStr = filtersArrayToNrql(selectedFilters);
    setEntitySearchFilter(
      filtersStr ? `${WORKLOAD_FILTER} AND ${filtersStr}` : WORKLOAD_FILTER
    );
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
    () => setFilterOptions((opts) => keyValuesFromEntities(entities, opts)),
    [entities]
  );

  useEffect(() => {
    if (entitiesError) console.error('Error fetching entities', entitiesError);
  }, [entitiesError]);

  return (
    <Modal
      hidden={!isSettingsModalOpen}
      onClose={closeHandler}
      style={{ '--modal-width': '860px', '--modal-padding': '16px 32px' }}
    >
      <div className="settings-modal">
        <HeadingText type={HeadingText.TYPE.HEADING_3}>Settings</HeadingText>
        <div className="filter-bar">
          <FilterBar options={filterOptions} onChange={filterWorkloads} />
        </div>
        <div className="settings-body">
          <div className="workloads-table">
            <AutoSizer>
              {({ height }) => (
                <DataTable
                  ariaLabel="Workloads"
                  itemCount={count || 0}
                  items={sortedEntities}
                  height={height}
                  selectionType={DataTable.SELECTION_TYPE.MULTIPLE}
                  selection={selection}
                  onSelectionChange={handleSelectionChange}
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

          <div className="selected-panel">
            <div className="selected-header">
              Selected
              {selectedList.length > 0 && (
                <span className="selected-count">{selectedList.length}</span>
              )}
            </div>
            <div className="selected-list">
              {selectedList.length === 0 ? (
                <div className="selected-empty">No workloads selected</div>
              ) : (
                selectedList.map((w) => (
                  <div key={w.guid} className="selected-item">
                    <span className="selected-item-name" title={w.name}>
                      {w.name}
                    </span>
                    <Button
                      variant={Button.VARIANT.TERTIARY}
                      sizeType={Button.SIZE_TYPE.SMALL}
                      iconType={
                        Button.ICON_TYPE.INTERFACE__OPERATIONS__CLOSE__SIZE_8
                      }
                      onClick={() => removeFromSelection(w.guid)}
                      ariaLabel={`Remove ${w.name}`}
                    />
                  </div>
                ))
              )}
            </div>
            <div className="display-options">
              <Switch
                label="Hide unacknowledged count"
                checked={hideUnacknowledged}
                onChange={(e) => setHideUnacknowledged(e.target.checked)}
              />
            </div>
            {saveError && (
              <div className="save-error" role="alert">
                Couldn&apos;t save settings:{' '}
                {saveError.message || 'Unknown error'}
              </div>
            )}
            <div className="buttons-bar">
              <Button onClick={closeHandler} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                type={Button.TYPE.PRIMARY}
                onClick={handleSave}
                loading={isSaving}
                disabled={isSaving}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

SettingsModal.propTypes = {
  onSave: PropTypes.func,
  isSettingsModalOpen: PropTypes.bool,
  setIsSettingsModalOpen: PropTypes.func,
  savedWorkloads: PropTypes.arrayOf(PropTypes.object),
  savedHideUnacknowledged: PropTypes.bool,
};

export default SettingsModal;
