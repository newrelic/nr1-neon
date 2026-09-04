import React, { useCallback, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { EmptyState, PlatformStateContext, useNerdletState } from 'nr1';

import { BoardView } from '../../src/components';
import {
  useBoardChrome,
  useBoardData,
  useBoardNavigation,
} from '../../src/hooks';
import BoardNotFound from './board-not-found';

// Single board experience: wires the data, navigation (with URL sync) and
// chrome hooks together, owns the board-doc write actions and the
// Settings/Workloads modal open-state, and renders the presentational BoardView.
const Board = ({
  boardId,
  onBack,
  onDeleteBoard,
  defaultBoardId = null,
  defaultBoardTitle = null,
  onSetDefaultBoard,
}) => {
  const { accountId } = useContext(PlatformStateContext);
  const [urlState, setUrlState] = useNerdletState();

  const {
    docLoading,
    docError,
    docData,
    boardMissing,
    data,
    dataLoading,
    dataError,
    refreshData,
    issuesData,
    issuesLoading,
    issuesError,
    workloadGuids,
    rootGrid,
    writeBoard,
  } = useBoardData(boardId, accountId);

  const nav = useBoardNavigation({
    rootGrid,
    data,
    issuesData,
    urlState,
    setUrlState,
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isWorkloadsModalOpen, setIsWorkloadsModalOpen] = useState(false);
  const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);
  const openWorkloadsModal = useCallback(
    () => setIsWorkloadsModalOpen(true),
    []
  );

  useBoardChrome({
    boardMissing,
    docLoading,
    title: docData?.title,
    onRefresh: refreshData,
    onOpenWorkloads: openWorkloadsModal,
    onOpenSettings: openSettingsModal,
  });

  useEffect(() => {
    if (docError) console.log('Error fetching board', docError);
    if (dataError) console.log('Error fetching statuses', dataError);
    if (issuesError) console.log('Error fetching issues', issuesError);
  }, [docError, dataError, issuesError]);

  const saveWorkloads = useCallback(
    async ({ workloads }) => {
      const { error } = await writeBoard({
        start: workloads?.map(({ accountId, guid, name }) => ({
          accountId,
          guid,
          name,
        })),
      });
      if (error) console.error('Unable to save workloads', error);
      return { error };
    },
    [writeBoard]
  );

  const saveBoardMeta = useCallback(
    async ({ title, description, hideUnacknowledged }) => {
      const { error } = await writeBoard({
        title,
        description,
        hideUnacknowledged: !!hideUnacknowledged,
      });
      if (error) console.error('Unable to save settings', error);
      return { error };
    },
    [writeBoard]
  );

  // Deletion is owned by the parent (NexusNerdlet): it redirects to the listing
  // immediately, soft-deletes the board, and shows an undoable toast. We just
  // hand over the current board document so it can be archived/restored.
  const deleteBoard = useCallback(
    () => onDeleteBoard?.({ ...(docData || {}), id: boardId }),
    [onDeleteBoard, docData, boardId]
  );

  const isDefaultBoard = defaultBoardId === boardId;
  const handleSetDefault = useCallback(
    (makeDefault) => onSetDefaultBoard?.(makeDefault ? boardId : null),
    [boardId, onSetDefaultBoard]
  );

  // Show the loading state until the board is genuinely ready: the doc is
  // loading, data is loading, or the board has workloads whose grid hasn't been
  // built yet. That last case covers the render between `data` resolving and the
  // rebuild effect running, which would otherwise flash the empty-grid state.
  const preparingContent =
    !boardMissing &&
    (dataLoading || (workloadGuids.length > 0 && !nav.gridSynced));

  if (docLoading || preparingContent)
    return (
      <EmptyState
        fullHeight
        fullWidth
        title="Setting up..."
        type={EmptyState.TYPE.LOADING}
      />
    );

  if (boardMissing) return <BoardNotFound onBack={onBack} />;

  return (
    <BoardView
      navigationStack={nav.navigationStack}
      gridData={nav.gridData}
      entities={nav.entities}
      hydratedEntities={nav.hydratedEntities}
      entitiesHydrating={nav.entitiesHydrating}
      activeTab={nav.activeTab}
      dataLoading={dataLoading}
      issuesLoading={issuesLoading}
      hideUnacknowledged={!!docData?.hideUnacknowledged}
      onCardClick={nav.onCardClick}
      onIssuesClick={nav.onIssuesClick}
      onChipClick={nav.onChipClick}
      onHomeClick={nav.onHomeClick}
      onEntityClick={nav.onEntityClick}
      onTabChange={nav.onTabChange}
      onOpenWorkloads={openWorkloadsModal}
      issuesWorkload={nav.issuesWorkload}
      entityNameByGuid={nav.entityNameByGuid}
      workloadAncestorNames={nav.workloadAncestorNames}
      onCloseWorkloadIssues={nav.closeWorkloadIssues}
      issuesEntity={nav.issuesEntity}
      onCloseEntityIssues={nav.closeEntityIssues}
      onOpenEntity={nav.openEntityInNewTab}
      settingsModal={{
        onSave: saveBoardMeta,
        onDelete: deleteBoard,
        onSetDefault: handleSetDefault,
        isOpen: isSettingsModalOpen,
        setIsOpen: setIsSettingsModalOpen,
        savedTitle: docData?.title ?? '',
        savedDescription: docData?.description ?? '',
        savedHideUnacknowledged: !!docData?.hideUnacknowledged,
        savedIsDefault: isDefaultBoard,
        otherDefaultBoardTitle: isDefaultBoard ? null : defaultBoardTitle,
      }}
      workloadsModal={{
        onSave: saveWorkloads,
        isOpen: isWorkloadsModalOpen,
        setIsOpen: setIsWorkloadsModalOpen,
        savedWorkloads: docData?.start ?? [],
      }}
    />
  );
};

Board.propTypes = {
  boardId: PropTypes.string,
  onBack: PropTypes.func,
  onDeleteBoard: PropTypes.func,
  defaultBoardId: PropTypes.string,
  defaultBoardTitle: PropTypes.string,
  onSetDefaultBoard: PropTypes.func,
};

export default Board;
