import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import { Button } from 'nr1';

const ANIMATION_CLASSES = {
  SLIDE_IN: 'slide-in',
  SLIDE_OUT: 'slide-out',
};

const Modal = ({ hidden, onClose, onHide, onShow, children }) => {
  const [animClass, setAnimClass] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!hidden) {
      dialog.showModal?.();
      setTimeout(() => dialog.querySelector?.(':focus')?.blur?.());
      setAnimClass(ANIMATION_CLASSES.SLIDE_IN);
    } else {
      setAnimClass(ANIMATION_CLASSES.SLIDE_OUT);
      // dialog.close?.();
    }
  }, [hidden]);

  const clickHandler = (e) => {
    if (e.target === dialogRef.current) onClose?.();
  };

  const animationEndHandler = () => {
    if (animClass === ANIMATION_CLASSES.SLIDE_IN) {
      onShow?.();
    } else if (animClass === ANIMATION_CLASSES.SLIDE_OUT) {
      onHide?.();
      dialogRef.current?.close?.();
    }
    setAnimClass('');
  };

  return (
    <dialog ref={dialogRef} className="modal-dialog" onClick={clickHandler}>
      <div
        className={`modal-frame ${animClass}`}
        onAnimationEnd={animationEndHandler}
      >
        <Button
          ariaLabel="Close modal"
          className="close-button"
          iconType={Button.ICON_TYPE.INTERFACE__SIGN__CLOSE}
          sizeType={Button.SIZE_TYPE.SMALL}
          variant={Button.VARIANT.TERTIARY}
          autoFocus={false}
          onClick={onClose}
        />
        <div className="modal-dialog-content">{children}</div>
      </div>
    </dialog>
  );
};

Modal.propTypes = {
  hidden: PropTypes.bool,
  onClose: PropTypes.func,
  onHide: PropTypes.func,
  onShow: PropTypes.func,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

export default Modal;
