import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

import * as nr1 from 'nr1';
import useDataManager from '../use-data-manager';
import { loadWorkloadTree } from '../../utils/workload-tree';

// Fake NerdGraph over an in-memory graph:
//   graph[guid] = { members: [{ guid, type }], searchQuery? }
// `collection.members` and `entitySearch` are paged `pageSize` at a time with
// numeric-offset cursors, so pagination paths get exercised with small data.
const makeFakeNerdGraph = (graph, { pageSize = 200, partialError } = {}) => {
  const outline = (m) => ({
    accountId: 1,
    guid: m.guid,
    name: m.guid,
    type: m.type,
    domain: m.type === 'WORKLOAD' ? 'NR1' : 'APM',
    workloadStatus:
      m.type === 'WORKLOAD' ? { statusValue: 'OPERATIONAL' } : undefined,
  });
  const page = (members, cursor) => {
    const start = cursor ? Number(cursor) : 0;
    const end = start + pageSize;
    return {
      nextCursor: end < members.length ? String(end) : null,
      entities: members.slice(start, end).map(outline),
    };
  };

  return jest.fn(async (query) => {
    const actor = {};
    for (const [, alias, guid] of query.matchAll(
      /(idx_\d+_b\d+): entity\(guid: "([^"]+)"\)/g
    )) {
      const node = graph[guid];
      if (!node) continue;
      actor[alias] = {
        accountId: 1,
        guid,
        name: guid,
        workloadStatus: { statusValue: 'OPERATIONAL' },
        collection: { members: { results: page(node.members || []) } },
      };
    }
    for (const [, alias, guid, cursor] of query.matchAll(
      /(mp_\d+): entity\(guid: "([^"]+)"\)[\s\S]*?results\(cursor: "([^"]+)"\)/g
    )) {
      actor[alias] = {
        collection: {
          members: { results: page(graph[guid].members, cursor) },
        },
      };
    }
    for (const [, alias, guid] of query.matchAll(
      /(wc_\d+): collection\(guid: "([^"]+)"\)/g
    )) {
      actor.a_1 = actor.a_1 || { workload: {} };
      actor.a_1.workload[alias] = {
        guid,
        entitySearchQuery: graph[guid]?.searchQuery ?? null,
      };
    }
    for (const [, alias, q, , cursor] of query.matchAll(
      /(es_\d+): entitySearch\(query: "([^"]+)"\) \{\s*results(\(cursor: "([^"]+)"\))?/g
    )) {
      const owner = Object.values(graph).find((n) => n.searchQuery === q);
      actor[alias] = { results: page(owner.searchMembers, cursor) };
    }
    return {
      data: { actor },
      error: partialError ? new Error(partialError) : null,
    };
  });
};

const silentLogger = { log: () => {}, warn: () => {} };
const load = (guids, graph, opts) =>
  loadWorkloadTree(guids, makeFakeNerdGraph(graph, opts), {
    logger: silentLogger,
  });

const workload = (guid) => ({ guid, type: 'WORKLOAD' });
const app = (guid) => ({ guid, type: 'APPLICATION' });

describe('loadWorkloadTree', () => {
  it('keeps every top-level workload and its subtree across multiple request batches', async () => {
    // 25 top-level guids → three level-1 requests (10 / 10 / 5).
    const graph = {};
    const guids = Array.from({ length: 25 }, (_, i) => `wl-${i}`);
    guids.forEach((g, i) => {
      graph[g] = { members: [workload(`child-${i}`)] };
      graph[`child-${i}`] = { members: [app(`app-${i}`)] };
    });

    const { data, error } = await load(guids, graph);

    expect(error).toBeNull();
    expect(data.map((w) => w.guid)).toEqual(guids);
    data.forEach((wl, i) => {
      expect(wl.children.map((c) => c.guid)).toEqual([`child-${i}`]);
      expect(wl.children[0].children.map((c) => c.guid)).toEqual([`app-${i}`]);
    });
  });

  it('follows nextCursor so every member page is loaded', async () => {
    const members = [
      ...Array.from({ length: 6 }, (_, i) => workload(`sub-${i}`)),
      app('app-a'),
    ];
    const graph = { root: { members } };
    members
      .filter((m) => m.type === 'WORKLOAD')
      .forEach((m) => {
        graph[m.guid] = { members: [app(`${m.guid}-app`)] };
      });

    // Page size 3 → root's 7 members arrive over 3 pages.
    const { data } = await load(['root'], graph, { pageSize: 3 });

    expect(data[0].children.map((c) => c.guid)).toEqual(
      members.map((m) => m.guid)
    );
    expect(data[0].children[5].children.map((c) => c.guid)).toEqual([
      'sub-5-app',
    ]);
  });

  it('keeps data when NerdGraph returns a partial error alongside it', async () => {
    const graph = { root: { members: [app('app-a')] } };
    const { data, error } = await load(['root'], graph, {
      partialError: 'Search Request is empty',
    });

    expect(error).toBeNull();
    expect(data[0].children.map((c) => c.guid)).toEqual(['app-a']);
  });

  it('reports an error when nothing could be loaded', async () => {
    const runQuery = jest.fn(async () => ({
      data: undefined,
      error: new Error('boom'),
    }));
    const { data, error } = await loadWorkloadTree(['root'], runQuery, {
      logger: silentLogger,
    });

    expect(data).toEqual([]);
    expect(error.message).toBe('boom');
  });

  it('makes a workload shared by two parents drillable under both', async () => {
    const graph = {
      a: { members: [workload('shared')] },
      b: { members: [workload('shared')] },
      shared: { members: [app('app-s')] },
    };
    const runQuery = makeFakeNerdGraph(graph);
    const { data } = await loadWorkloadTree(['a', 'b'], runQuery, {
      logger: silentLogger,
    });

    expect(data[0].children[0].children.map((c) => c.guid)).toEqual(['app-s']);
    expect(data[1].children[0].children.map((c) => c.guid)).toEqual(['app-s']);
    // `shared` was fetched once, not once per parent.
    const sharedFetches = runQuery.mock.calls.filter(([q]) =>
      q.includes('entity(guid: "shared")')
    );
    expect(sharedFetches).toHaveLength(1);
  });

  it('cuts cycles instead of recursing forever', async () => {
    const graph = {
      a: { members: [workload('b')] },
      b: { members: [workload('a'), app('app-b')] },
    };
    const { data } = await load(['a'], graph);

    const b = data[0].children[0];
    expect(b.children.map((c) => c.guid)).toEqual(['a', 'app-b']);
    // The back-reference to `a` is a leaf, not another copy of the tree.
    expect(b.children[0].children).toBeUndefined();
  });

  it('falls back to a paginated entitySearch for workloads with no members', async () => {
    const searchMembers = [app('x'), app('y'), app('z'), workload('empty')];
    const graph = {
      empty: {
        members: [],
        searchQuery: 'tags.team = pay',
        searchMembers,
      },
    };
    const { data } = await load(['empty'], graph, { pageSize: 2 });

    // Self-reference is dropped; the remaining 3 arrive over 2 pages.
    expect(data[0].children.map((c) => c.guid)).toEqual(['x', 'y', 'z']);
  });
});

describe('useDataManager', () => {
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
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore(); // eslint-disable-line no-console
    console.warn.mockRestore(); // eslint-disable-line no-console
  });

  it('stays loading through partial errors and publishes the tree once complete', async () => {
    const fake = makeFakeNerdGraph(
      {
        root: { members: [workload('child')] },
        child: { members: [app('app-c')] },
      },
      { partialError: 'Search Request is empty' }
    );
    let releaseLevel2;
    const level2Gate = new Promise((resolve) => {
      releaseLevel2 = resolve;
    });
    nr1.NerdGraphQuery.query.mockImplementation(async ({ query }) => {
      if (query.includes('idx_2_')) await level2Gate;
      return fake(query);
    });

    const guids = ['root'];
    const captured = renderHookResult(guids);

    // Level 1 answered (with a partial error), level 2 still in flight.
    await waitFor(() =>
      expect(nr1.NerdGraphQuery.query).toHaveBeenCalledTimes(2)
    );
    expect(captured.current.loading).toBe(true);
    expect(captured.current.data).toEqual([]);
    expect(captured.current.error).toBeNull();

    await act(async () => releaseLevel2());
    await waitFor(() => expect(captured.current.loading).toBe(false));

    expect(captured.current.error).toBeNull();
    expect(captured.current.data[0].children[0].children[0].guid).toBe('app-c');
  });
});
