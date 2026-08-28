import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';

import SettingsModal from '../index';

const baseProps = {
  isSettingsModalOpen: true,
  savedTitle: 'Payments',
  savedDescription: 'Payment platform',
  savedHideUnacknowledged: false,
};

const renderModal = (props = {}) =>
  render(<SettingsModal {...baseProps} {...props} />);

// Both panels are always in the DOM (they sit in the horizontal slider track),
// so "Delete board" appears twice — scope queries to the relevant panel.
const settingsPanel = () => document.querySelector('.settings-panel');
const confirmPanel = () => document.querySelector('.confirm-panel');
const clickDeleteTrigger = () =>
  fireEvent.click(within(settingsPanel()).getByText('Delete board'));
const clickDeleteConfirm = () =>
  fireEvent.click(within(confirmPanel()).getByText('Delete board'));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SettingsModal', () => {
  it('is hidden when isSettingsModalOpen is false', () => {
    renderModal({ isSettingsModalOpen: false });
    const frame = document.querySelector('.modal-frame');
    expect(frame.className).not.toMatch(/slide-in/);
  });

  it('shows the title, description and action buttons when open', () => {
    renderModal();
    const panel = within(settingsPanel());
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(panel.getByText('Payments')).toBeInTheDocument();
    expect(panel.getByText('Payment platform')).toBeInTheDocument();
    expect(panel.getByText('Save')).toBeInTheDocument();
    expect(panel.getByText('Delete board')).toBeInTheDocument();
  });

  it('reveals a text field when the title edit icon is clicked', () => {
    renderModal();
    expect(screen.queryByLabelText('Title')).toBeNull();
    fireEvent.click(screen.getByLabelText('Edit title'));
    expect(screen.getByLabelText('Title')).toHaveValue('Payments');
  });

  it('returns to the read-only view when the edit close icon is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Edit title'));
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Done editing title'));
    expect(screen.queryByLabelText('Title')).toBeNull();
    // Back to the display row with the edit pencil available again.
    expect(screen.getByLabelText('Edit title')).toBeInTheDocument();
  });

  it('saves edited title/description and the toggle via onSave', async () => {
    const onSave = jest.fn(async () => ({}));
    const setIsSettingsModalOpen = jest.fn();
    renderModal({ onSave, setIsSettingsModalOpen });

    fireEvent.click(screen.getByLabelText('Edit title'));
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Payments v2' },
    });
    fireEvent.click(screen.getByLabelText('Hide unacknowledged count'));

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledWith({
      title: 'Payments v2',
      description: 'Payment platform',
      hideUnacknowledged: true,
    });
    expect(setIsSettingsModalOpen).toHaveBeenCalledWith(false);
  });

  it('disables Save when the title is empty', () => {
    renderModal({ savedTitle: '' });
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('shows the unsaved-changes message only once a change is made', () => {
    renderModal();
    expect(screen.queryByTestId('nr1-InlineMessage')).toBeNull();

    fireEvent.click(screen.getByLabelText('Hide unacknowledged count'));
    expect(screen.getByTestId('nr1-InlineMessage').textContent).toMatch(
      /unsaved changes/i
    );
  });

  it('does not close and surfaces an error when onSave fails', async () => {
    const onSave = jest.fn(async () => ({ error: new Error('boom') }));
    const setIsSettingsModalOpen = jest.fn();
    renderModal({ onSave, setIsSettingsModalOpen });
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });
    expect(setIsSettingsModalOpen).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('alert').textContent).toMatch(/boom/);
  });

  it('closes the modal when Cancel is clicked', () => {
    const setIsSettingsModalOpen = jest.fn();
    renderModal({ setIsSettingsModalOpen });
    fireEvent.click(within(settingsPanel()).getByText('Cancel'));
    expect(setIsSettingsModalOpen).toHaveBeenCalledWith(false);
  });

  it('slides to the confirmation panel and back on Delete / Cancel', () => {
    renderModal();
    const slider = document.querySelector('.settings-slider');
    expect(slider.className).not.toMatch(/show-confirm/);

    clickDeleteTrigger();
    expect(slider.className).toMatch(/show-confirm/);
    expect(screen.getByText('Delete board?')).toBeInTheDocument();

    // The confirmation panel's own Cancel returns to the settings panel.
    fireEvent.click(within(confirmPanel()).getByText('Cancel'));
    expect(slider.className).not.toMatch(/show-confirm/);
  });

  it('calls onDelete when deletion is confirmed', async () => {
    const onDelete = jest.fn(async () => ({}));
    renderModal({ onDelete });
    clickDeleteTrigger();
    await act(async () => {
      clickDeleteConfirm();
    });
    expect(onDelete).toHaveBeenCalled();
  });

  it('surfaces an error when deletion fails', async () => {
    const onDelete = jest.fn(async () => ({ error: new Error('nope') }));
    renderModal({ onDelete });
    clickDeleteTrigger();
    await act(async () => {
      clickDeleteConfirm();
    });
    expect(screen.getByRole('alert').textContent).toMatch(/nope/);
  });
});
