import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  EmptyState,
  HeadingText,
  Icon,
  Spinner,
  TextField,
  useAccountStorageQuery,
} from 'nr1';

import CreateBoardModal from '../create-board-modal';
import { BOARDS_STORE } from '../../constants';
import { formatCreatedMeta, normalizeBoards } from '../../utils';

// Landing page: a searchable, favoritable list of boards. Clicking a board
// opens it; the "New board" flow creates one and opens it immediately.
const BoardsList = ({
  accountId,
  favorites,
  onToggleFavorite,
  onOpenBoard,
}) => {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, loading, error } = useAccountStorageQuery({
    accountId,
    ...BOARDS_STORE,
    skip: !accountId,
  });

  const boards = useMemo(() => normalizeBoards(data), [data]);

  const isFavorite = useCallback((id) => !!favorites?.[id], [favorites]);

  const visibleBoards = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? boards.filter(
          (b) =>
            (b.title || '').toLowerCase().includes(term) ||
            (b.description || '').toLowerCase().includes(term)
        )
      : boards;
    // Favorites float to the top, then alphabetical by title.
    return [...filtered].sort((a, b) => {
      const af = isFavorite(a.id);
      const bf = isFavorite(b.id);
      if (af !== bf) return af ? -1 : 1;
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [boards, search, isFavorite]);

  const openCreate = useCallback(() => setIsCreateOpen(true), []);
  const closeCreate = useCallback(() => setIsCreateOpen(false), []);
  const handleCreated = useCallback(
    (id) => {
      setIsCreateOpen(false);
      onOpenBoard?.(id);
    },
    [onOpenBoard]
  );

  const createModal = (
    <CreateBoardModal
      isOpen={isCreateOpen}
      accountId={accountId}
      onClose={closeCreate}
      onCreated={handleCreated}
    />
  );

  if (loading)
    return (
      <div className="boards-loading">
        <Spinner />
      </div>
    );

  if (error) {
    console.log('Error fetching boards', error);
  }

  if (!boards.length)
    return (
      <>
        <EmptyState
          fullHeight
          fullWidth
          type={EmptyState.TYPE.USER_CLEARED}
          illustrationType={EmptyState.ILLUSTRATION_TYPE.ILLUSTRATION_03}
          title="No boards yet."
          description="Create your first board to start tracking system health."
          action={{ label: 'Add board', onClick: openCreate }}
        />
        {createModal}
      </>
    );

  return (
    <div className="boards-list">
      <div className="boards-list-header">
        <HeadingText type={HeadingText.TYPE.HEADING_3}>Boards</HeadingText>
        <div className="boards-list-actions">
          <TextField
            type={TextField.TYPE.SEARCH}
            placeholder="Search boards"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant={Button.VARIANT.PRIMARY}
            sizeType={Button.SIZE_TYPE.SMALL}
            iconType={Button.ICON_TYPE.INTERFACE__SIGN__PLUS}
            onClick={openCreate}
          >
            New board
          </Button>
        </div>
      </div>

      {visibleBoards.length === 0 ? (
        <div className="boards-empty-search">No boards match that search.</div>
      ) : (
        <div className="boards-grid">
          {visibleBoards.map((board) => {
            const favorited = isFavorite(board.id);
            return (
              <div
                key={board.id}
                className="board-card"
                role="button"
                tabIndex={0}
                onClick={() => onOpenBoard?.(board.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenBoard?.(board.id);
                  }
                }}
              >
                <div className="board-card-header">
                  <h3 className="board-card-title" title={board.title}>
                    {board.title}
                  </h3>
                  <button
                    type="button"
                    className={`u-unstyledButton fav-toggle ${
                      favorited ? 'favorited' : ''
                    }`}
                    aria-label={
                      favorited ? 'Remove from favorites' : 'Add to favorites'
                    }
                    aria-pressed={favorited}
                    onClick={(e) => {
                      // Don't let the toggle bubble into the card's open handler.
                      e.stopPropagation();
                      onToggleFavorite?.(board.id);
                    }}
                  >
                    <Icon
                      type={
                        favorited
                          ? Icon.TYPE.PROFILES__EVENTS__FAVORITE__WEIGHT_BOLD
                          : Icon.TYPE.PROFILES__EVENTS__FAVORITE
                      }
                    />
                  </button>
                </div>
                {board.description ? (
                  <p className="board-card-description">{board.description}</p>
                ) : null}
                <div className="board-card-meta">
                  {formatCreatedMeta(board.createdBy, board.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createModal}
    </div>
  );
};

BoardsList.propTypes = {
  accountId: PropTypes.number,
  favorites: PropTypes.object,
  onToggleFavorite: PropTypes.func,
  onOpenBoard: PropTypes.func,
};

export default BoardsList;
