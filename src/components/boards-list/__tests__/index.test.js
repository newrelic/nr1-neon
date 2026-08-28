import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

import * as nr1 from 'nr1';
import BoardsList from '../index';

const boardDocs = [
  {
    id: 'b-1',
    document: {
      id: 'b-1',
      title: 'Payments',
      description: 'Payment platform health',
      createdBy: { name: 'Ada' },
      createdAt: '2026-01-02T00:00:00.000Z',
    },
  },
  {
    id: 'b-2',
    document: {
      id: 'b-2',
      title: 'Checkout',
      description: '',
      createdBy: { name: 'Grace' },
      createdAt: '2026-02-02T00:00:00.000Z',
    },
  },
];

const setBoards = (data, { loading = false, error = null } = {}) => {
  nr1.useAccountStorageQuery.mockReturnValue({ data, loading, error });
};

const renderList = (props = {}) =>
  render(
    <BoardsList
      accountId={42}
      favorites={{}}
      onToggleFavorite={jest.fn()}
      onOpenBoard={jest.fn()}
      {...props}
    />
  );

beforeEach(() => {
  jest.clearAllMocks();
  setBoards(boardDocs);
});

describe('BoardsList', () => {
  it('shows the empty state with an Add board action when there are no boards', () => {
    setBoards([]);
    renderList();
    expect(screen.getByTestId('nr1-EmptyState-title').textContent).toBe(
      'No boards yet.'
    );
    expect(screen.getByTestId('nr1-EmptyState-action').textContent).toBe(
      'Add board'
    );
  });

  it('renders a card per board with title and description', () => {
    renderList();
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Payment platform health')).toBeInTheDocument();
  });

  it('shows the creator and created date in the card meta', () => {
    renderList();
    expect(screen.getByText(/Created by Ada/)).toBeInTheDocument();
  });

  it('filters boards by the search term', () => {
    renderList();
    fireEvent.change(screen.getByPlaceholderText('Search boards'), {
      target: { value: 'check' },
    });
    expect(screen.queryByText('Payments')).toBeNull();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
  });

  it('sorts favorited boards to the top', () => {
    renderList({ favorites: { 'b-2': true } });
    const titles = screen
      .getAllByRole('button')
      .map((b) => b.querySelector('.board-card-title')?.textContent)
      .filter(Boolean);
    expect(titles[0]).toBe('Checkout');
  });

  it('clicking a card opens the board', () => {
    const onOpenBoard = jest.fn();
    renderList({ onOpenBoard });
    fireEvent.click(screen.getByText('Payments').closest('.board-card'));
    expect(onOpenBoard).toHaveBeenCalledWith('b-1');
  });

  it('clicking the favorite toggle calls onToggleFavorite without opening the board', () => {
    const onOpenBoard = jest.fn();
    const onToggleFavorite = jest.fn();
    renderList({ onOpenBoard, onToggleFavorite });
    const paymentsCard = screen.getByText('Payments').closest('.board-card');
    fireEvent.click(within(paymentsCard).getByLabelText('Add to favorites'));
    expect(onToggleFavorite).toHaveBeenCalledWith('b-1');
    expect(onOpenBoard).not.toHaveBeenCalled();
  });

  it('shows a no-match message when the search excludes everything', () => {
    renderList();
    fireEvent.change(screen.getByPlaceholderText('Search boards'), {
      target: { value: 'zzz' },
    });
    expect(screen.getByText(/No boards match/)).toBeInTheDocument();
  });
});
