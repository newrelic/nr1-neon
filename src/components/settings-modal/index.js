import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  HeadingText,
  InlineMessage,
  MultilineTextField,
  Switch,
  TextField,
} from 'nr1';

import Modal from '../modal';

// Board settings: edit the board's title/description, toggle the unacknowledged
// count, and delete the board. The workloads picker lives in WorkloadsModal.
// Deleting repurposes this same modal: the settings panel slides out and a
// confirmation panel slides in (see styles.scss / .settings-slider).
const SettingsModal = ({
  onSave,
  onDelete,
  isSettingsModalOpen,
  setIsSettingsModalOpen,
  savedTitle = '',
  savedDescription = '',
  savedHideUnacknowledged = false,
}) => {
  const [title, setTitle] = useState(savedTitle);
  const [description, setDescription] = useState(savedDescription);
  const [hideUnacknowledged, setHideUnacknowledged] = useState(
    savedHideUnacknowledged
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset to saved state each time the modal opens.
  useEffect(() => {
    if (isSettingsModalOpen) {
      setTitle(savedTitle);
      setDescription(savedDescription);
      setHideUnacknowledged(savedHideUnacknowledged);
      setEditingTitle(false);
      setEditingDescription(false);
      setShowDeleteConfirm(false);
      setSaveError(null);
      setDeleteError(null);
    }
  }, [isSettingsModalOpen]);

  const trimmedTitle = title.trim();
  const canSave = trimmedTitle.length > 0 && !isSaving;

  // Any edit to title/description/toggle means there are unsaved changes.
  const isDirty =
    trimmedTitle !== savedTitle.trim() ||
    description.trim() !== savedDescription.trim() ||
    hideUnacknowledged !== savedHideUnacknowledged;

  const closeHandler = useCallback(() => {
    setIsSettingsModalOpen?.(false);
  }, [setIsSettingsModalOpen]);

  const handleSave = useCallback(async () => {
    if (!trimmedTitle) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const result = await onSave?.({
        title: trimmedTitle,
        description: description.trim(),
        hideUnacknowledged,
      });
      if (result?.error) {
        setSaveError(result.error);
        return;
      }
      setIsSettingsModalOpen?.(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    trimmedTitle,
    description,
    hideUnacknowledged,
    onSave,
    setIsSettingsModalOpen,
  ]);

  const handleDelete = useCallback(async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await onDelete?.();
      if (result?.error) {
        setDeleteError(result.error);
        return;
      }
      // On success the board is gone; the parent redirects to the listing and
      // unmounts this modal, so there's nothing more to do here.
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete]);

  return (
    <Modal
      hidden={!isSettingsModalOpen}
      onClose={closeHandler}
      style={{ '--modal-width': '480px', '--modal-padding': '16px 32px' }}
    >
      <div className="settings-modal board-settings">
        <div
          className={`settings-slider ${
            showDeleteConfirm ? 'show-confirm' : ''
          }`}
        >
          <div className="slide-panel settings-panel">
            <HeadingText type={HeadingText.TYPE.HEADING_3}>
              Settings
            </HeadingText>

            <div className="panel-body">
              <div className="meta-field">
                <div className="meta-header">
                  <span className="meta-label">Title</span>
                  <Button
                    variant={Button.VARIANT.TERTIARY}
                    sizeType={Button.SIZE_TYPE.SMALL}
                    iconType={
                      editingTitle
                        ? Button.ICON_TYPE.INTERFACE__OPERATIONS__CLOSE
                        : Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT
                    }
                    onClick={() => setEditingTitle((v) => !v)}
                    ariaLabel={
                      editingTitle ? 'Done editing title' : 'Edit title'
                    }
                  />
                </div>
                {editingTitle ? (
                  <TextField
                    label="Title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                ) : (
                  <span className="meta-text" title={title}>
                    {title}
                  </span>
                )}
              </div>

              <div className="meta-field">
                <div className="meta-header">
                  <span className="meta-label">Description</span>
                  <Button
                    variant={Button.VARIANT.TERTIARY}
                    sizeType={Button.SIZE_TYPE.SMALL}
                    iconType={
                      editingDescription
                        ? Button.ICON_TYPE.INTERFACE__OPERATIONS__CLOSE
                        : Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT
                    }
                    onClick={() => setEditingDescription((v) => !v)}
                    ariaLabel={
                      editingDescription
                        ? 'Done editing description'
                        : 'Edit description'
                    }
                  />
                </div>
                {editingDescription ? (
                  <MultilineTextField
                    label="Description"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                ) : (
                  <span
                    className={`meta-text ${description ? '' : 'muted'}`}
                    title={description}
                  >
                    {description || 'No description'}
                  </span>
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
            </div>

            {isDirty && (
              <div className="unsaved-hint">
                <InlineMessage
                  type={InlineMessage.TYPE.WARNING}
                  label="You have unsaved changes. Click Save to keep them."
                />
              </div>
            )}

            <div className="buttons-bar split">
              <Button
                variant={Button.VARIANT.DESTRUCTIVE}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
              >
                Delete board
              </Button>
              <div className="right-buttons">
                <Button onClick={closeHandler} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  variant={Button.VARIANT.PRIMARY}
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={!canSave}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          <div className="slide-panel confirm-panel">
            <HeadingText type={HeadingText.TYPE.HEADING_3}>
              Delete board?
            </HeadingText>
            <p className="confirm-text">
              Are you sure you want to delete{' '}
              <strong>{savedTitle || 'this board'}</strong> and its settings?
            </p>

            {deleteError && (
              <div className="save-error" role="alert">
                Couldn&apos;t delete board:{' '}
                {deleteError.message || 'Unknown error'}
              </div>
            )}

            <div className="buttons-bar split">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant={Button.VARIANT.DESTRUCTIVE}
                onClick={handleDelete}
                loading={isDeleting}
                disabled={isDeleting}
              >
                Delete board
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
  onDelete: PropTypes.func,
  isSettingsModalOpen: PropTypes.bool,
  setIsSettingsModalOpen: PropTypes.func,
  savedTitle: PropTypes.string,
  savedDescription: PropTypes.string,
  savedHideUnacknowledged: PropTypes.bool,
};

export default SettingsModal;
