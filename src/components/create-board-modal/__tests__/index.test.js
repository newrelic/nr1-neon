import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import * as nr1 from 'nr1';
import CreateBoardModal from '../index';

const renderModal = (props = {}) =>
  render(
    <CreateBoardModal
      isOpen
      accountId={42}
      onClose={jest.fn()}
      onCreated={jest.fn()}
      {...props}
    />
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CreateBoardModal', () => {
  it('disables the create button until a title is entered', () => {
    renderModal();
    const createBtn = screen.getByText('Create board');
    expect(createBtn).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'My board' },
    });
    expect(createBtn).not.toBeDisabled();
  });

  it('writes a uuid board document and reports the new id on save', async () => {
    const onCreated = jest.fn();
    renderModal({ onCreated });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: '  My board  ' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Covers everything' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Create board'));
    });

    expect(nr1.__docWriteFn).toHaveBeenCalledTimes(1);
    const call = nr1.__docWriteFn.mock.calls[0][0];
    expect(call.accountId).toBe(42);
    expect(call.collection).toBe('nexus');
    expect(call.documentId).toBe(call.document.id); // documentId === the uuid stored in the doc
    expect(call.document.title).toBe('My board'); // trimmed
    expect(call.document.description).toBe('Covers everything');
    expect(call.document.createdBy).toEqual({
      id: 'u-1',
      name: 'Test User',
      email: 'test@example.com',
    });
    expect(call.document.start).toEqual([]);
    expect(onCreated).toHaveBeenCalledWith(call.document.id);
  });

  it('surfaces a save error and does not report creation', async () => {
    nr1.__docWriteFn.mockResolvedValueOnce({ error: { message: 'nope' } });
    const onCreated = jest.fn();
    renderModal({ onCreated });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'My board' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Create board'));
    });
    expect(screen.getByRole('alert').textContent).toMatch(/nope/);
    expect(onCreated).not.toHaveBeenCalled();
  });
});
