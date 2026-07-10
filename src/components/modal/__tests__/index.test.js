import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import Modal from '../index';

describe('Modal', () => {
  it('renders its children when open', () => {
    render(
      <Modal hidden={false}>
        <div data-testid="child">hello</div>
      </Modal>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders a close button', () => {
    render(
      <Modal hidden={false}>
        <div>x</div>
      </Modal>
    );
    const closeBtn = screen.getByLabelText('Close modal');
    expect(closeBtn).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal hidden={false} onClose={onClose}>
        <div>x</div>
      </Modal>
    );
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the backdrop (dialog element) is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(
      <Modal hidden={false} onClose={onClose}>
        <div>x</div>
      </Modal>
    );
    const dialog = container.querySelector('dialog.modal-dialog');
    // The click handler only fires onClose when the click target IS the dialog
    // itself (i.e., the backdrop). Simulate that.
    fireEvent.click(dialog, { target: dialog });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when the click bubbles up from inside the frame', () => {
    const onClose = jest.fn();
    render(
      <Modal hidden={false} onClose={onClose}>
        <div data-testid="child">x</div>
      </Modal>
    );
    fireEvent.click(screen.getByTestId('child'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onShow when the slide-in animation ends', () => {
    const onShow = jest.fn();
    const { container } = render(
      <Modal hidden={false} onShow={onShow}>
        <div>x</div>
      </Modal>
    );
    const frame = container.querySelector('.modal-frame');
    expect(frame.className).toMatch(/slide-in/);
    fireEvent.animationEnd(frame);
    expect(onShow).toHaveBeenCalled();
  });

  it('calls onHide when the slide-out animation ends after being hidden', () => {
    const onHide = jest.fn();
    const { container, rerender } = render(
      <Modal hidden={false} onHide={onHide}>
        <div>x</div>
      </Modal>
    );
    // Finish slide-in first.
    fireEvent.animationEnd(container.querySelector('.modal-frame'));

    rerender(
      <Modal hidden={true} onHide={onHide}>
        <div>x</div>
      </Modal>
    );
    const frame = container.querySelector('.modal-frame');
    expect(frame.className).toMatch(/slide-out/);
    fireEvent.animationEnd(frame);
    expect(onHide).toHaveBeenCalled();
  });

  it('passes the style prop to the modal frame', () => {
    const { container } = render(
      <Modal hidden={false} style={{ '--modal-width': '600px' }}>
        <div>x</div>
      </Modal>
    );
    const frame = container.querySelector('.modal-frame');
    expect(frame.style.getPropertyValue('--modal-width')).toBe('600px');
  });
});
