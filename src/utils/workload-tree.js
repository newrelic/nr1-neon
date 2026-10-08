import {
  ACCOUNT_ALIAS_PREFIX,
  COLLECTION_BATCH_ALIAS_PREFIX,
  ENTITIES_BATCH_ALIAS_PREFIX,
  MEMBERS_PAGE_ALIAS_PREFIX,
  SEARCH_BATCH_ALIAS_PREFIX,
  queryCollectionsByAccount,
  queryEntitySearches,
  queryFromGuids,
  queryMemberPages,
} from '../queries';
import { chunk } from './issues';
import { mapWithConcurrency } from './workloads';

const MAX_TREE_DEPTH = 10;
// NerdGraph caps a single query at 225 fields. With the trimmed
// ENTITY_FRAGMENT we spend ~18-20 fields per workload entity, so 10 per
// request keeps us comfortably under the limit with margin. The same size is
// used for member-page, collection and entitySearch batches.
const BATCH_SIZE = 10;
// Requests in flight at once. Each level (and each round of follow-up pages)
// fans out over this many parallel NerdGraph requests.
const MAX_CONCURRENT_QUERIES = 6;
// Safety valve on cursor-following: 50 pages × 200 = 10k members per workload.
const MAX_MEMBER_PAGES = 50;
const LOG_PREFIX = '[useDataManager]';

/* eslint-disable no-console */
const defaultLogger = {
  log: (...args) => console.log(LOG_PREFIX, ...args),
  warn: (...args) => console.warn(LOG_PREFIX, ...args),
};
/* eslint-enable no-console */

const toOutline = (entity) => ({
  alertSeverity: entity?.alertSeverity,
  domain: entity?.domain,
  guid: entity?.guid,
  name: entity?.name,
  type: entity?.type,
  accountId: entity?.accountId,
  status: entity?.workloadStatus?.statusValue || 'UNKNOWN',
});

const isWorkloadOutline = (e) => e?.type === 'WORKLOAD' && !!e.guid;

// Walks a built tree and returns workloads that have neither children nor a
// known status — usually a sign NerdGraph returned nothing useful for them.
const collectBrokenWorkloads = (tree) => {
  const out = [];
  const seen = new Set();
  const walk = (nodes, depth) => {
    for (const node of nodes) {
      if (!node || seen.has(node)) continue;
      seen.add(node);
      const isWorkload = depth === 0 || node.type === 'WORKLOAD';
      if (!isWorkload) continue;
      const childCount = node.children?.length ?? 0;
      const hasStatus = !!node.status && node.status !== 'UNKNOWN';
      if (childCount === 0 && !hasStatus) {
        out.push({ guid: node.guid, name: node.name, depth });
      }
      if (childCount > 0) walk(node.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
};

// Loads the full workload tree under `topLevelGuids`.
//
// `runQuery(queryString)` must resolve to `{ data, error }` (the shape of
// `NerdGraphQuery.query`). Partial errors are tolerated: NerdGraph returns
// data alongside an error when only some aliases fail (e.g. a workload with
// an empty entity search: "Search Request is empty…"), so whatever came back
// is used and the rest is logged. The load only reports an `error` when
// nothing at all could be loaded.
//
// Each workload guid is fetched once (breadth-first, level by level, with
// requests in parallel), following `nextCursor` until all of its members are
// in. Workloads with no members fall back to resolving their
// `entitySearchQuery`. The tree is assembled at the end, so a workload that
// appears under several parents is drillable under each of them. Cycles are
// cut at the point a workload would contain one of its own ancestors.
//
// Resolves to `{ data, error }`, where `data` is the same top-level node
// array `useDataManager` has always produced.
export const loadWorkloadTree = async (
  topLevelGuids,
  runQuery,
  { logger = defaultLogger } = {}
) => {
  const infoByGuid = new Map(); // workload guid -> { accountId, name, status }
  const membersByGuid = new Map(); // workload guid -> member outlines
  const fatalErrors = [];
  const partialErrors = new Map(); // message -> count
  let requestCount = 0;

  const run = async (query) => {
    requestCount += 1;
    try {
      const { data, error } = await runQuery(query);
      if (error) {
        const message = error.message || String(error);
        partialErrors.set(message, (partialErrors.get(message) || 0) + 1);
        if (!data) fatalErrors.push(error);
      }
      return data?.actor || {};
    } catch (e) {
      fatalErrors.push(e);
      return {};
    }
  };

  // Follows `nextCursor` for `pending` ({ key, cursor, ... }) until every
  // entry is exhausted. `fetchBatch(batch)` returns one `results` object
  // (`{ nextCursor, entities }`) per batch entry, and `onPage(entry,
  // entities)` receives each page.
  const followCursors = async (pending, fetchBatch, onPage) => {
    let round = pending;
    let pages = 1;
    let truncated = 0;
    while (round.length) {
      if (pages >= MAX_MEMBER_PAGES) {
        truncated = round.length;
        break;
      }
      const nextRound = [];
      await mapWithConcurrency(
        chunk(round, BATCH_SIZE),
        MAX_CONCURRENT_QUERIES,
        async (batch) => {
          const results = await fetchBatch(batch);
          batch.forEach((entry, i) => {
            const res = results[i];
            onPage(entry, res?.entities || []);
            if (res?.nextCursor) {
              nextRound.push({ ...entry, cursor: res.nextCursor });
            }
          });
        }
      );
      round = nextRound;
      pages += 1;
    }
    if (truncated) {
      logger.warn(
        `${truncated} member list(s) still had more pages after ${MAX_MEMBER_PAGES} pages; the rest are not shown`
      );
    }
  };

  const fetchMemberPages = (pending) =>
    followCursors(
      pending,
      async (batch) => {
        const actor = await run(queryMemberPages(batch));
        return batch.map(
          (_, i) =>
            actor[`${MEMBERS_PAGE_ALIAS_PREFIX}${i}`]?.collection?.members
              ?.results
        );
      },
      ({ guid }, entities) => {
        membersByGuid.get(guid).push(...entities.map(toOutline));
      }
    );

  // Workloads whose `collection.members` came back empty: resolve their
  // `entitySearchQuery` and run that search instead.
  const fetchFallbackMembers = async (empties) => {
    const searches = [];
    await mapWithConcurrency(
      chunk(empties, BATCH_SIZE),
      MAX_CONCURRENT_QUERIES,
      async (batch) => {
        const byAccount = {};
        batch.forEach(({ guid, accountId }) => {
          (byAccount[accountId] = byAccount[accountId] || []).push(guid);
        });
        const actor = await run(queryCollectionsByAccount(byAccount));
        Object.keys(actor)
          .filter((k) => k.startsWith(ACCOUNT_ALIAS_PREFIX))
          .forEach((accountKey) => {
            const wlMap = actor[accountKey]?.workload || {};
            Object.keys(wlMap)
              .filter((k) => k.startsWith(COLLECTION_BATCH_ALIAS_PREFIX))
              .forEach((k) => {
                const coll = wlMap[k];
                if (coll?.guid && coll.entitySearchQuery) {
                  searches.push({
                    guid: coll.guid,
                    query: coll.entitySearchQuery,
                  });
                }
              });
          });
      }
    );

    let recovered = 0;
    await followCursors(
      searches,
      async (batch) => {
        const actor = await run(queryEntitySearches(batch));
        return batch.map(
          (_, i) => actor[`${SEARCH_BATCH_ALIAS_PREFIX}${i}`]?.results
        );
      },
      ({ guid }, entities) => {
        // Drop any self-reference: a workload's entitySearchQuery sometimes
        // matches its own entity, which would otherwise create a cycle.
        const members = entities
          .filter((e) => e?.guid && e.guid !== guid)
          .map(toOutline);
        const list = membersByGuid.get(guid);
        if (members.length && !list.length) recovered += 1;
        list.push(...members);
      }
    );

    logger.log(
      `fallback: ${empties.length} empty workload(s), ${searches.length} with an entitySearchQuery, ${recovered} recovered`
    );
  };

  const fetchLevel = async (guids, level) => {
    const pending = [];
    const empties = [];
    const missing = [];
    let nullCollection = 0;

    await mapWithConcurrency(
      chunk(guids, BATCH_SIZE),
      MAX_CONCURRENT_QUERIES,
      async (batch) => {
        const actor = await run(queryFromGuids(batch, level));
        batch.forEach((guid, i) => {
          const entity = actor[`${ENTITIES_BATCH_ALIAS_PREFIX(level)}${i}`];
          if (!entity) {
            missing.push(guid);
            return;
          }
          infoByGuid.set(guid, {
            accountId: entity.accountId,
            name: entity.name,
            status: entity.workloadStatus?.statusValue || 'UNKNOWN',
          });
          const results = entity.collection?.members?.results;
          const members = (results?.entities || []).map(toOutline);
          membersByGuid.set(guid, members);
          if (entity.collection == null) {
            nullCollection += 1;
          } else if (results?.nextCursor) {
            pending.push({ guid, cursor: results.nextCursor });
          } else if (!members.length && entity.accountId != null) {
            empties.push({ guid, accountId: entity.accountId });
          }
        });
      }
    );

    if (pending.length) await fetchMemberPages(pending);
    if (empties.length) await fetchFallbackMembers(empties);

    logger.log(
      `level ${level}: ${guids.length} workload(s), ${pending.length} paginated, ${empties.length} empty, ${nullCollection} null collection, ${missing.length} not returned`
    );
    if (missing.length) {
      logger.warn(
        `level ${level}: ${missing.length} guid(s) queried but not returned by NerdGraph`,
        missing
      );
    }
  };

  // ----- Fetch: breadth-first, each workload guid once -----
  const roots = [...new Set(topLevelGuids)];
  const visited = new Set(roots);
  let frontier = roots;
  let level = 1;
  let maxLevel = 0;
  logger.log(`starting fetch: ${roots.length} top-level workloads`);

  while (frontier.length) {
    await fetchLevel(frontier, level);
    maxLevel = level;
    const next = [];
    frontier.forEach((guid) =>
      (membersByGuid.get(guid) || []).forEach((m) => {
        if (isWorkloadOutline(m) && !visited.has(m.guid)) {
          visited.add(m.guid);
          next.push(m.guid);
        }
      })
    );
    if (level >= MAX_TREE_DEPTH) {
      if (next.length) {
        logger.warn(
          `hit MAX_TREE_DEPTH (${MAX_TREE_DEPTH}); ${next.length} workload(s) not expanded`
        );
      }
      break;
    }
    frontier = next;
    level += 1;
  }

  // ----- Build: assemble the tree from the per-guid member lists -----
  // Subtrees are memoised per guid, so a workload shared by several parents
  // is built once and referenced from each.
  const built = new Map();
  const ancestors = new Set();
  const buildChildren = (guid) => {
    if (built.has(guid)) return built.get(guid);
    ancestors.add(guid);
    const children = (membersByGuid.get(guid) || []).map((member) => {
      if (
        !isWorkloadOutline(member) ||
        !membersByGuid.has(member.guid) ||
        ancestors.has(member.guid)
      ) {
        return member;
      }
      return { ...member, children: buildChildren(member.guid) };
    });
    ancestors.delete(guid);
    built.set(guid, children);
    return children;
  };

  const data = roots
    .filter((guid) => infoByGuid.has(guid))
    .map((guid) => {
      const { accountId, name, status } = infoByGuid.get(guid);
      return { accountId, name, guid, status, children: buildChildren(guid) };
    });

  const accountIds = new Set(
    [...infoByGuid.values()].map((i) => i.accountId).filter(Boolean)
  );
  logger.log(
    `done: ${infoByGuid.size} workloads across ${accountIds.size} accounts, max depth ${maxLevel}, ${requestCount} request(s)`
  );
  if (partialErrors.size) {
    logger.warn(
      'NerdGraph returned partial errors (data for the other aliases was kept):',
      Object.fromEntries(partialErrors)
    );
  }
  const broken = collectBrokenWorkloads(data);
  if (broken.length) {
    logger.warn(
      `${broken.length} workload(s) appear broken (empty children AND unknown status — likely missing data in NerdGraph):`,
      broken
    );
  }

  const error = data.length === 0 && fatalErrors.length ? fatalErrors[0] : null;
  return { data, error };
};

export default loadWorkloadTree;
