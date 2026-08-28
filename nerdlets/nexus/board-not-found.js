import React from 'react';
import PropTypes from 'prop-types';

import { EmptyState } from 'nr1';

// Shown when a boardId in urlState doesn't resolve to a stored board (stale
// deep-link, deleted board, wrong account).
const BoardNotFound = ({ onBack }) => (
  <EmptyState
    fullHeight
    fullWidth
    type={EmptyState.TYPE.ERROR}
    illustrationType={EmptyState.ILLUSTRATION_TYPE.ILLUSTRATION_03}
    title="Board not found"
    description="This board doesn't exist, or isn't available on the selected account."
    action={{ label: 'Back to boards', onClick: onBack }}
  />
);

BoardNotFound.propTypes = {
  onBack: PropTypes.func,
};

export default BoardNotFound;
