import React from 'react';
import { render } from '@testing-library/react';

import * as nr1 from 'nr1';
import useTeamEntities from '../use-team-entities';

// RTL 12 has no renderHook, so drive the hook through a tiny harness that
// stashes each render's result for assertions.
const renderHookResult = (guids) => {
  const captured = {};
  const Harness = () => {
    captured.current = useTeamEntities(guids);
    return null;
  };
  render(<Harness />);
  return captured;
};

beforeEach(() => {
  jest.clearAllMocks();
  nr1.useEntitiesByGuidsQuery.mockReturnValue({
    data: { entities: [] },
    loading: false,
  });
});

describe('useTeamEntities', () => {
  it('skips the query and returns an empty map when there are no guids', () => {
    const captured = renderHookResult([]);
    expect(nr1.useEntitiesByGuidsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ entityGuids: [], skip: true })
    );
    expect(captured.current.data).toEqual({});
    // loading is gated by skip, so it reads false even if the hook says loading.
    expect(captured.current.loading).toBe(false);
  });

  it('builds a { [guid]: { guid, name, accountId } } map from hydrated entities', () => {
    nr1.useEntitiesByGuidsQuery.mockReturnValue({
      data: {
        entities: [
          { guid: 'team-1', name: 'Payments', accountId: 42, type: 'TEAM' },
          { guid: 'team-2', name: 'Platform', accountId: 7, type: 'TEAM' },
        ],
      },
      loading: false,
    });
    const captured = renderHookResult(['team-1', 'team-2']);
    expect(nr1.useEntitiesByGuidsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        entityGuids: ['team-1', 'team-2'],
        skip: false,
      })
    );
    expect(captured.current.data).toEqual({
      'team-1': { guid: 'team-1', name: 'Payments', accountId: 42 },
      'team-2': { guid: 'team-2', name: 'Platform', accountId: 7 },
    });
  });

  it('reports loading while the query is in flight (guids present)', () => {
    nr1.useEntitiesByGuidsQuery.mockReturnValue({
      data: { entities: [] },
      loading: true,
    });
    const captured = renderHookResult(['team-1']);
    expect(captured.current.loading).toBe(true);
  });
});
