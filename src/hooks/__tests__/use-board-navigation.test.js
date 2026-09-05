import { resolveNav } from '../use-board-navigation';

// A small workload tree: root workload "a" contains a sub-workload "b" (which in
// turn contains a leaf entity "c") and a leaf entity "e".
const tree = () => [
  {
    guid: 'a',
    name: 'A',
    children: [
      {
        guid: 'b',
        name: 'B',
        domain: 'NR1',
        type: 'WORKLOAD',
        children: [
          { guid: 'c', name: 'C', domain: 'APM', type: 'APPLICATION' },
        ],
      },
      { guid: 'e', name: 'E', domain: 'APM', type: 'APPLICATION' },
    ],
  },
];

describe('resolveNav', () => {
  it('returns the root grid and no drill-down for an empty path', () => {
    const root = tree();
    const { navigationStack, gridData, entities } = resolveNav(root, []);
    expect(navigationStack).toEqual([]);
    expect(gridData).toBe(root);
    expect(entities).toEqual([]);
  });

  it('splits a workload into sub-workloads and leaf entities one level down', () => {
    const root = tree();
    const { navigationStack, gridData, entities } = resolveNav(root, ['a']);
    expect(navigationStack).toEqual([{ items: root, activeId: 'a' }]);
    expect(gridData.map((w) => w.guid)).toEqual(['b']);
    expect(entities.map((e) => e.guid)).toEqual(['e']);
  });

  it('walks a multi-step path, replaying each drill-down', () => {
    const root = tree();
    const { navigationStack, gridData, entities } = resolveNav(root, [
      'a',
      'b',
    ]);
    expect(navigationStack.map((l) => l.activeId)).toEqual(['a', 'b']);
    expect(gridData).toEqual([]); // b has no sub-workloads
    expect(entities.map((e) => e.guid)).toEqual(['c']);
  });

  it('stops at the deepest resolvable level when a guid is gone', () => {
    const root = tree();
    const { navigationStack, gridData } = resolveNav(root, ['a', 'missing']);
    expect(navigationStack.map((l) => l.activeId)).toEqual(['a']);
    expect(gridData.map((w) => w.guid)).toEqual(['b']);
  });

  it('falls back to the root when the first guid does not resolve', () => {
    const root = tree();
    const { navigationStack, gridData } = resolveNav(root, ['nope']);
    expect(navigationStack).toEqual([]);
    expect(gridData).toBe(root);
  });

  it('tolerates a null root grid', () => {
    expect(resolveNav(null, ['a'])).toEqual({
      navigationStack: [],
      gridData: [],
      entities: [],
    });
  });
});
