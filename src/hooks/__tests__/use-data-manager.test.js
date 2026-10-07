import React from 'react';
import { render, waitFor } from '@testing-library/react';

import * as nr1 from 'nr1';
import useDataManager from '../use-data-manager';

// Fake NerdGraph: answers `idx_<level>_b<i>: entity(guid: "...")` aliases.
// Top-level workloads `wl-N` each contain one child workload `child-N`, which
// in turn contains one app `app-N`. Responses are cached per query string so
// queryData identity is stable across renders, as with the real hook.
const ALIAS_RE = /(idx_\d+_b\d+): entity\(guid: "([^"]+)"\)/g;
const memberFor = (guid) =>
  guid.startsWith('wl-')
    ? { guid: guid.replace('wl-', 'child-'), name: guid, type: 'WORKLOAD' }
    : { guid: guid.replace('child-', 'app-'), name: guid, type: 'APPLICATION' };

const responses = new Map();
const respond = (query) => {
  if (!responses.has(query)) {
    const actor = {};
    for (const [, alias, guid] of query.matchAll(ALIAS_RE)) {
      actor[alias] = {
        accountId: 1,
        guid,
        name: guid,
        workloadStatus: { statusValue: 'OPERATIONAL' },
        collection: { members: { results: { entities: [memberFor(guid)] } } },
      };
    }
    responses.set(query, { actor });
  }
  return responses.get(query);
};

const renderHookResult = (guids) => {
  const captured = {};
  const Harness = () => {
    captured.current = useDataManager(guids);
    return null;
  };
  render(<Harness />);
  return captured;
};

beforeEach(() => {
  jest.clearAllMocks();
  responses.clear();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  nr1.useNerdGraphQuery.mockImplementation(({ query, skip }) => ({
    data: skip ? undefined : respond(query),
    loading: false,
    error: null,
  }));
});

afterEach(() => {
  console.log.mockRestore(); // eslint-disable-line no-console
});

describe('useDataManager', () => {
  it('keeps every top-level workload and its subtree when level 1 spans multiple chunks', async () => {
    // 25 guids → 3 chunks at level 1 (10 / 10 / 5).
    const guids = Array.from({ length: 25 }, (_, i) => `wl-${i}`);
    const captured = renderHookResult(guids);

    await waitFor(() => expect(captured.current.loading).toBe(false));

    const { data, error } = captured.current;
    expect(error).toBeNull();
    expect(data.map((w) => w.guid)).toEqual(guids);
    data.forEach((wl, i) => {
      expect(wl.children).toHaveLength(1);
      expect(wl.children[0].guid).toBe(`child-${i}`);
      expect(wl.children[0].children.map((c) => c.guid)).toEqual([`app-${i}`]);
    });
  });
});
