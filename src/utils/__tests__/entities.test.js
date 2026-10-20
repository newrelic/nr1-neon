import { sortEntities } from '../entities';
import { ENTITY_SORTS } from '../../constants';

const e = (name, alertSeverity) => ({ guid: name, name, alertSeverity });

const ENTITIES = [
  e('delta', 'NOT_ALERTING'),
  e('alpha', 'NOT_CONFIGURED'),
  e('charlie', 'CRITICAL'),
  e('bravo', 'WARNING'),
  e('echo', 'CRITICAL'),
];

const names = (list) => list.map((x) => x.name);

describe('sortEntities', () => {
  it('defaults to status, critical first, ties broken by name', () => {
    expect(names(sortEntities(ENTITIES))).toEqual([
      'charlie',
      'echo',
      'bravo',
      'delta',
      'alpha',
    ]);
  });

  it('sorts healthy first, keeping names ascending within a status', () => {
    expect(names(sortEntities(ENTITIES, ENTITY_SORTS.STATUS_BEST))).toEqual([
      'alpha',
      'delta',
      'bravo',
      'charlie',
      'echo',
    ]);
  });

  it('sorts by name in both directions', () => {
    expect(names(sortEntities(ENTITIES, ENTITY_SORTS.NAME_ASC))).toEqual([
      'alpha',
      'bravo',
      'charlie',
      'delta',
      'echo',
    ]);
    expect(names(sortEntities(ENTITIES, ENTITY_SORTS.NAME_DESC))).toEqual([
      'echo',
      'delta',
      'charlie',
      'bravo',
      'alpha',
    ]);
  });

  it('treats a missing severity like not configured', () => {
    const list = [e('a', undefined), e('b', 'NOT_ALERTING')];
    expect(names(sortEntities(list))).toEqual(['b', 'a']);
  });

  it('falls back to the default for an unknown sort and does not mutate', () => {
    const input = [...ENTITIES];
    expect(names(sortEntities(input, 'bogus'))[0]).toBe('charlie');
    expect(input).toEqual(ENTITIES);
  });
});
