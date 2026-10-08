import React from 'react';
import { render, waitFor } from '@testing-library/react';

import * as nr1 from 'nr1';
import useEntitiesByGuids from '../use-entities-by-guids';

const renderHookResult = (props) => {
  const captured = {};
  const Harness = () => {
    captured.current = useEntitiesByGuids(props);
    return null;
  };
  render(<Harness />);
  return captured;
};

const guids = (n) => Array.from({ length: n }, (_, i) => `g-${i}`);

beforeEach(() => {
  jest.clearAllMocks();
  nr1.useEntitiesByGuidsQuery.mockReturnValue({
    data: { entities: [{ guid: 'from-hook' }] },
    loading: false,
  });
  nr1.EntitiesByGuidsQuery.query.mockImplementation(
    async ({ entityGuids }) => ({
      data: { entities: entityGuids.map((guid) => ({ guid })) },
    })
  );
});

describe('useEntitiesByGuids', () => {
  it('uses useEntitiesByGuidsQuery directly for up to 25 guids', () => {
    const captured = renderHookResult({ entityGuids: guids(25) });
    expect(nr1.useEntitiesByGuidsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ entityGuids: guids(25), skip: false })
    );
    expect(nr1.EntitiesByGuidsQuery.query).not.toHaveBeenCalled();
    expect(captured.current.data.entities).toEqual([{ guid: 'from-hook' }]);
  });

  it('fetches more than 25 guids in 25-guid batches and merges them', async () => {
    const captured = renderHookResult({ entityGuids: guids(60) });
    expect(captured.current.loading).toBe(true);
    expect(captured.current.data.entities).toEqual([]);

    await waitFor(() => expect(captured.current.loading).toBe(false));

    const batches = nr1.EntitiesByGuidsQuery.query.mock.calls.map(
      ([{ entityGuids }]) => entityGuids.length
    );
    expect(batches).toEqual([25, 25, 10]);
    expect(captured.current.data.entities.map((e) => e.guid)).toEqual(
      guids(60)
    );
    // The single-shot hook is skipped above the cap.
    expect(nr1.useEntitiesByGuidsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ entityGuids: [], skip: true })
    );
  });
});
