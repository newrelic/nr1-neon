import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { Button, HeadingText, Icon, InlineMessage } from 'nr1';

import Modal from '../modal';
import LiveKpiRow from '../live-kpi-row';
import KpiEditor from './kpi-editor';
import { generateId } from '../../utils';

// Stable serialization of a KPI list for dirty-checking (order-sensitive).
const serializeKpis = (list) =>
  JSON.stringify(
    (list || []).map(({ id, label, accountId, query }) => ({
      id,
      label,
      accountId,
      query,
    }))
  );

// Order-insensitive serialization of the pinned-id set for dirty-checking.
const serializePins = (ids) => JSON.stringify([...(ids || [])].sort());

// Per-card settings, opened from the card's actions menu. Built as a two-panel
// carousel (see styles.scss / .card-settings-slider): the list of the card's
// KPIs (reorderable, each with hero + pin toggles) slides out and the single-KPI
// editor slides in. Scoped to KPIs for now, but the panel/slider structure
// leaves room for future sections.
//
// All edits are staged locally and only persisted when the user clicks Save,
// via `onSave({ kpis, heroId, pinnedIds })`.
const CardSettingsModal = ({
  isOpen,
  setIsOpen,
  workloadName = '',
  savedKpis = [],
  savedHeroId = null,
  savedPinnedIds = [],
  defaultAccountId = null,
  onSave,
}) => {
  const [workingKpis, setWorkingKpis] = useState(savedKpis);
  const [heroId, setHeroId] = useState(savedHeroId);
  const [pinnedIds, setPinnedIds] = useState(savedPinnedIds);
  const [view, setView] = useState('list'); // 'list' | 'editor'
  const [editingKpi, setEditingKpi] = useState(null);
  // Bumped on each add/edit so KpiEditor remounts with fresh state. null until
  // the editor is first opened, so it (and its live preview query) stays
  // unmounted while the user is only looking at the list.
  const [editorSession, setEditorSession] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  // Drag-to-reorder state. `armed` gates the row's draggable attribute so a drag
  // only starts from the sort handle (not from a stray grab on the row body).
  const [armed, setArmed] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  // Reset to the saved state each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setWorkingKpis(savedKpis);
      setHeroId(savedHeroId || null);
      setPinnedIds(savedPinnedIds || []);
      setView('list');
      setEditingKpi(null);
      setEditorSession(null);
      setSaveError(null);
    }
  }, [isOpen]);

  const openEditor = useCallback((kpi) => {
    setEditingKpi(kpi ?? null);
    setEditorSession((n) => (n === null ? 0 : n + 1));
    setView('editor');
  }, []);

  const backToList = useCallback(() => setView('list'), []);

  const commitKpi = useCallback((kpi) => {
    setWorkingKpis((prev) => {
      if (kpi.id && prev.some((k) => k.id === kpi.id)) {
        return prev.map((k) => (k.id === kpi.id ? { ...k, ...kpi } : k));
      }
      return [...prev, { ...kpi, id: kpi.id || generateId() }];
    });
    setView('list');
  }, []);

  const removeKpi = useCallback((id) => {
    setWorkingKpis((prev) => prev.filter((k) => k.id !== id));
    // A removed KPI can't remain the hero or stay pinned.
    setHeroId((prev) => (prev === id ? null : prev));
    setPinnedIds((prev) => prev.filter((p) => p !== id));
  }, []);

  // At most one hero; clicking the current hero clears it (min zero).
  const toggleHero = useCallback((id) => {
    setHeroId((prev) => (prev === id ? null : id));
  }, []);

  // Any number of KPIs can be pinned (kept visible when the card is collapsed).
  const togglePin = useCallback((id) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  // Reorder matters: the card shows KPIs in this order (pinned ones stay visible
  // when collapsed).
  const reorderKpi = useCallback((from, to) => {
    setWorkingKpis((prev) => {
      if (from == null || to == null || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const endDrag = useCallback(() => {
    setArmed(false);
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const closeHandler = useCallback(() => setIsOpen?.(false), [setIsOpen]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const result = await onSave?.({
        kpis: workingKpis,
        heroId,
        pinnedIds,
      });
      if (result?.error) {
        setSaveError(result.error);
        return;
      }
      setIsOpen?.(false);
    } finally {
      setIsSaving(false);
    }
  }, [workingKpis, heroId, pinnedIds, onSave, setIsOpen]);

  // Staged changes aren't persisted until Save; warn the user so a Cancel or a
  // backdrop click doesn't silently drop their edits.
  const isDirty =
    serializeKpis(workingKpis) !== serializeKpis(savedKpis) ||
    (heroId || null) !== (savedHeroId || null) ||
    serializePins(pinnedIds) !== serializePins(savedPinnedIds);

  return (
    <Modal
      hidden={!isOpen}
      onClose={closeHandler}
      style={{ '--modal-width': '560px', '--modal-padding': '16px 32px' }}
    >
      <div className="settings-modal card-settings-modal">
        <div
          className="card-settings-slider"
          style={{
            // Panels are ordered list (0), editor (1); shift one panel-width
            // (half the slider) left to reveal the editor.
            transform: `translateX(-${view === 'editor' ? 50 : 0}%)`,
          }}
        >
          {/* List panel */}
          <div className="slide-panel list-panel">
            <div className="panel-heading">
              <HeadingText
                type={HeadingText.TYPE.HEADING_3}
                className="workload-name"
                title={workloadName}
              >
                {workloadName || 'Card'}
              </HeadingText>
              <span className="panel-subtitle">Card settings</span>
            </div>

            <div className="panel-body">
              <div className="section-header">
                <span className="section-label">KPIs</span>
                <Button
                  variant={Button.VARIANT.TERTIARY}
                  sizeType={Button.SIZE_TYPE.SMALL}
                  iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
                  onClick={() => openEditor(null)}
                >
                  Add KPI
                </Button>
              </div>

              {workingKpis.length === 0 ? (
                <div className="kpis-empty">
                  No KPIs yet. Click <strong>Add KPI</strong> to create one.
                </div>
              ) : (
                <div className="kpi-defs">
                  {workingKpis.map((kpi, index) => (
                    <div
                      className={`kpi-def-row${
                        dragIndex === index ? ' dragging' : ''
                      }${
                        overIndex === index && dragIndex !== index
                          ? ' drag-over'
                          : ''
                      }`}
                      key={kpi.id}
                      draggable={armed}
                      onDragStart={(e) => {
                        setDragIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (overIndex !== index) setOverIndex(index);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        reorderKpi(dragIndex, index);
                        endDrag();
                      }}
                      onDragEnd={endDrag}
                    >
                      <span
                        className="kpi-def-reorder"
                        role="button"
                        aria-label={`Drag to reorder ${kpi.label || 'KPI'}`}
                        title="Drag to reorder"
                        // Arm draggable only while grabbing the handle so the
                        // rest of the row stays interactive.
                        onMouseDown={() => setArmed(true)}
                        onMouseUp={() => setArmed(false)}
                      >
                        <Icon type={Icon.TYPE.INTERFACE__ARROW__SORT} />
                      </span>
                      <div className="kpi-def-preview kpi-list">
                        <LiveKpiRow def={kpi} />
                      </div>
                      <div className="kpi-def-actions">
                        <Button
                          className={
                            heroId === kpi.id
                              ? 'hero-toggle is-hero'
                              : 'hero-toggle'
                          }
                          variant={Button.VARIANT.TERTIARY}
                          sizeType={Button.SIZE_TYPE.SMALL}
                          iconType={
                            Button.ICON_TYPE.INTERFACE__OPERATIONS__THUNDER
                          }
                          ariaLabel={
                            heroId === kpi.id
                              ? `Unset ${kpi.label || 'KPI'} as hero`
                              : `Set ${kpi.label || 'KPI'} as hero`
                          }
                          onClick={() => toggleHero(kpi.id)}
                        />
                        <Button
                          className={
                            pinnedIds.includes(kpi.id)
                              ? 'pin-toggle is-pinned'
                              : 'pin-toggle'
                          }
                          variant={Button.VARIANT.TERTIARY}
                          sizeType={Button.SIZE_TYPE.SMALL}
                          iconType={
                            pinnedIds.includes(kpi.id)
                              ? Button.ICON_TYPE
                                  .INTERFACE__OPERATIONS__PIN__WEIGHT_BOLD
                              : Button.ICON_TYPE.INTERFACE__OPERATIONS__PIN
                          }
                          ariaLabel={
                            pinnedIds.includes(kpi.id)
                              ? `Unpin ${kpi.label || 'KPI'}`
                              : `Pin ${kpi.label || 'KPI'}`
                          }
                          onClick={() => togglePin(kpi.id)}
                        />
                        <Button
                          variant={Button.VARIANT.TERTIARY}
                          sizeType={Button.SIZE_TYPE.SMALL}
                          iconType={
                            Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT
                          }
                          ariaLabel={`Edit ${kpi.label || 'KPI'}`}
                          onClick={() => openEditor(kpi)}
                        />
                        <Button
                          variant={Button.VARIANT.TERTIARY}
                          sizeType={Button.SIZE_TYPE.SMALL}
                          iconType={
                            Button.ICON_TYPE.INTERFACE__OPERATIONS__TRASH
                          }
                          ariaLabel={`Remove ${kpi.label || 'KPI'}`}
                          onClick={() => removeKpi(kpi.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {saveError && (
                <div className="save-error" role="alert">
                  Couldn&apos;t save KPIs:{' '}
                  {saveError.message || 'Unknown error'}
                </div>
              )}
            </div>

            {isDirty && (
              <div className="unsaved-hint">
                <InlineMessage
                  type={InlineMessage.TYPE.WARNING}
                  label="You have unsaved changes. Click Save to keep them."
                />
              </div>
            )}

            <div className="buttons-bar">
              <Button onClick={closeHandler} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant={Button.VARIANT.PRIMARY}
                onClick={handleSave}
                loading={isSaving}
                disabled={isSaving}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Editor panel (mounted lazily once the editor is first opened) */}
          {editorSession !== null && (
            <KpiEditor
              key={editorSession}
              initialKpi={editingKpi}
              defaultAccountId={defaultAccountId}
              onDone={commitKpi}
              onCancel={backToList}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

CardSettingsModal.propTypes = {
  isOpen: PropTypes.bool,
  setIsOpen: PropTypes.func,
  workloadName: PropTypes.string,
  // Resolved KPI definitions for the card being edited.
  savedKpis: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string,
      accountId: PropTypes.number,
      query: PropTypes.string,
    })
  ),
  // Persisted hero KPI id for the card being edited.
  savedHeroId: PropTypes.string,
  // Persisted pinned KPI ids for the card being edited.
  savedPinnedIds: PropTypes.arrayOf(PropTypes.string),
  defaultAccountId: PropTypes.number,
  onSave: PropTypes.func,
};

export default CardSettingsModal;
