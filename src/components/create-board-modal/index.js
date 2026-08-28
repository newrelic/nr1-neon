import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  HeadingText,
  MultilineTextField,
  TextField,
  useAccountStorageMutation,
  useUserQuery,
} from 'nr1';

import Modal from '../modal';
import { BOARDS_STORE } from '../../constants';
import { generateId } from '../../utils';

// Modal for creating a new board: title (required) + optional description.
// Writes a uuid-keyed document to the boards collection, then hands the new id
// back to the caller so it can open the board.
const CreateBoardModal = ({ isOpen, accountId, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { data: user } = useUserQuery();
  const [write] = useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
  });

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setSaveError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  const trimmedTitle = title.trim();
  const canSave = trimmedTitle.length > 0 && !isSaving;

  const handleSave = useCallback(async () => {
    if (!trimmedTitle) return;
    const id = generateId();
    const createdBy = user
      ? {
          id: user.id ?? null,
          name: user.name ?? null,
          email: user.email ?? null,
        }
      : null;
    setSaveError(null);
    setIsSaving(true);
    try {
      const { error } = await write({
        accountId,
        ...BOARDS_STORE,
        documentId: id,
        document: {
          id,
          title: trimmedTitle,
          description: description.trim(),
          createdBy,
          createdAt: new Date().toISOString(),
          start: [],
          hideUnacknowledged: false,
        },
      });
      if (error) {
        setSaveError(error);
        return;
      }
      onCreated?.(id);
    } finally {
      setIsSaving(false);
    }
  }, [trimmedTitle, description, user, accountId, write, onCreated]);

  return (
    <Modal
      hidden={!isOpen}
      onClose={onClose}
      style={{ '--modal-width': '480px', '--modal-padding': '16px 32px' }}
    >
      <div className="create-board-modal">
        <HeadingText type={HeadingText.TYPE.HEADING_3}>New board</HeadingText>
        <div className="create-board-fields">
          <TextField
            label="Title"
            name="title"
            placeholder="e.g. Payments platform health"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <MultilineTextField
            label="Description"
            name="description"
            placeholder="Optional. What does this board cover?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {saveError && (
          <div className="save-error" role="alert">
            Couldn&apos;t create board: {saveError.message || 'Unknown error'}
          </div>
        )}
        <div className="buttons-bar">
          <Button onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type={Button.TYPE.PRIMARY}
            onClick={handleSave}
            loading={isSaving}
            disabled={!canSave}
          >
            Create board
          </Button>
        </div>
      </div>
    </Modal>
  );
};

CreateBoardModal.propTypes = {
  isOpen: PropTypes.bool,
  accountId: PropTypes.number,
  onClose: PropTypes.func,
  onCreated: PropTypes.func,
};

export default CreateBoardModal;
