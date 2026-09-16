import React, { useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { Button, HeadingText, TextField } from 'nr1';
import { NrqlEditor } from '@newrelic/nr-labs-components';

import LiveKpiRow from '../live-kpi-row';
import { AppContext } from '../../contexts';

// Editor for a single KPI. Rendered as the second panel of the CardSettingsModal
// carousel. Local, uncommitted state — the parent remounts this (via `key`) for
// each add/edit so state always starts fresh from `initialKpi`.
const KpiEditor = ({ initialKpi, defaultAccountId, onDone, onCancel }) => {
  const { accounts } = useContext(AppContext) || {};
  const [label, setLabel] = useState(initialKpi?.label ?? '');
  const [accountId, setAccountId] = useState(
    initialKpi?.accountId ?? defaultAccountId ?? null
  );
  const [query, setQuery] = useState(initialKpi?.query ?? '');

  // Feed NrqlEditor's built-in account picker. It renders as a native <select>,
  // which floats above the modal dialog — unlike nr1's AccountPicker, whose
  // popover is trapped beneath the dialog's z-index.
  const accountsList = useMemo(
    () => (accounts || []).map(({ id, name }) => ({ value: id, label: name })),
    [accounts]
  );

  const trimmedLabel = label.trim();
  const trimmedQuery = query.trim();
  const canSave = trimmedLabel.length > 0 && trimmedQuery.length > 0;

  const handleDone = () => {
    if (!canSave) return;
    onDone?.({
      ...(initialKpi || {}),
      label: trimmedLabel,
      accountId,
      query: trimmedQuery,
    });
  };

  return (
    <div className="slide-panel kpi-editor-panel">
      <HeadingText type={HeadingText.TYPE.HEADING_4}>
        {initialKpi ? 'Edit KPI' : 'Add KPI'}
      </HeadingText>

      <div className="editor-body">
        <TextField
          label="Label"
          placeholder="e.g. Error rate"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <div className="field">
          <span className="field-label">Query</span>
          <NrqlEditor
            query={query}
            accountId={accountId}
            // Its own account <select> (renders above the dialog). Passing
            // accounts is also required — NrqlEditor calls accounts.reduce(...)
            // unconditionally, so omitting it throws on mount.
            accounts={accountsList}
            onSave={({ query: nextQuery, accountId: nextAccountId }) => {
              setQuery(nextQuery ?? '');
              if (nextAccountId) setAccountId(nextAccountId);
            }}
            placeholder="Enter a NRQL query..."
            saveButtonText="Preview"
          />
        </div>

        <div className="preview">
          <span className="field-label">Preview</span>
          <div className="preview-card">
            <div className="kpi-list">
              {trimmedQuery ? (
                <LiveKpiRow
                  def={{
                    label: trimmedLabel || 'Untitled KPI',
                    accountId,
                    query: trimmedQuery,
                  }}
                />
              ) : (
                <div className="preview-empty">
                  Apply a query to preview this KPI.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="buttons-bar">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant={Button.VARIANT.PRIMARY}
          onClick={handleDone}
          disabled={!canSave}
        >
          {initialKpi ? 'Update KPI' : 'Add KPI'}
        </Button>
      </div>
    </div>
  );
};

KpiEditor.propTypes = {
  initialKpi: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    accountId: PropTypes.number,
    query: PropTypes.string,
  }),
  defaultAccountId: PropTypes.number,
  onDone: PropTypes.func,
  onCancel: PropTypes.func,
};

export default KpiEditor;
