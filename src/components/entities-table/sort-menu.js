import React, { useState } from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  Icon,
  Popover,
  PopoverBody,
  PopoverTrigger,
  Tooltip,
} from 'nr1';

import { DEFAULT_ENTITY_SORT, ENTITY_SORT_OPTIONS } from '../../constants';

// Sort icon in the entities table header. Opens a single-choice list of row
// orders; picking one applies it and closes the popover.
const SortMenu = ({ value = DEFAULT_ENTITY_SORT, onChange }) => {
  const [opened, setOpened] = useState(false);
  const [tooltipOpened, setTooltipOpened] = useState(false);
  const current =
    ENTITY_SORT_OPTIONS.find((o) => o.value === value) ??
    ENTITY_SORT_OPTIONS.find((o) => o.value === DEFAULT_ENTITY_SORT);

  const select = (next) => {
    setOpened(false);
    if (next !== current.value) onChange?.(next);
  };

  const handleKeyDown = (e, next) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(next);
    }
  };

  // Options are divs, not buttons, so the platform's button styles can't leak
  // in. The tooltip is suppressed while the menu is open so it doesn't cover it.
  return (
    <Tooltip
      text={`Sorted by ${current.label}`}
      opened={tooltipOpened && !opened}
      onOpenChange={(_e, isOpen) => setTooltipOpened(isOpen)}
    >
      <Popover opened={opened} onChange={(_e, isOpen) => setOpened(isOpen)}>
        <PopoverTrigger>
          <Button
            className="sort-menu-trigger"
            type={Button.TYPE.PLAIN}
            sizeType={Button.SIZE_TYPE.SMALL}
            iconType={Icon.TYPE.INTERFACE__ARROW__SORT}
            ariaLabel="Sort entities"
          />
        </PopoverTrigger>
        <PopoverBody>
          <div className="sort-menu" role="menu" aria-label="Sort entities">
            {ENTITY_SORT_OPTIONS.map((opt) => {
              const selected = opt.value === current.value;
              return (
                <div
                  key={opt.value}
                  role="menuitemradio"
                  aria-checked={selected}
                  tabIndex={0}
                  className={`sort-menu-option ${selected ? 'selected' : ''}`}
                  onClick={() => select(opt.value)}
                  onKeyDown={(e) => handleKeyDown(e, opt.value)}
                >
                  <span className="sort-menu-check">
                    {selected && (
                      <Icon type={Icon.TYPE.INTERFACE__SIGN__CHECKMARK} />
                    )}
                  </span>
                  {opt.label}
                </div>
              );
            })}
          </div>
        </PopoverBody>
      </Popover>
    </Tooltip>
  );
};

SortMenu.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
};

export default SortMenu;
