import { useEffect, useMemo, useRef, useState } from 'react';
import { NerdGraphQuery } from 'nr1';

import {
  alertingEntitiesByAccount,
  composeIssuesNrqlQuery,
  issuesByEntity,
  issuesTree,
  mapNrqlRowToIssue,
} from '../utils';

const NRQL_LIMIT_MAX = 5000;
const LOG_PREFIX = '[useAlertingEntitiesIssues]';

const useAlertingEntitiesIssues = ({ data, skip }) => {
  const [issuesData, setIssuesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchIdRef = useRef(0);
  const startedSigRef = useRef(null);

  const entitiesByAccount = useMemo(() => {
    if (skip) return null;
    const map = alertingEntitiesByAccount(data);
    return map.size === 0 ? null : map;
  }, [data, skip]);

  const sig = useMemo(() => {
    if (!entitiesByAccount) return null;
    return [...entitiesByAccount.entries()]
      .map(([acct, guids]) => `${acct}:${[...guids].sort().join(',')}`)
      .sort()
      .join('|');
  }, [entitiesByAccount]);

  useEffect(() => {
    if (!entitiesByAccount || !sig) {
      setIssuesData(null);
      setLoading(false);
      setError(null);
      startedSigRef.current = null;
      return;
    }

    if (startedSigRef.current === sig) return;
    startedSigRef.current = sig;

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    const totalEntities = [...entitiesByAccount.values()].reduce(
      (sum, g) => sum + g.length,
      0
    );
    // eslint-disable-next-line no-console
    console.log(
      `${LOG_PREFIX} starting fetch: ${
        entitiesByAccount.size
      } account(s), ${totalEntities} alerting entit${
        totalEntities === 1 ? 'y' : 'ies'
      }`
    );

    (async () => {
      const allIssues = [];
      let droppedClosed = 0;
      let droppedNoMatch = 0;
      try {
        for (const [accountId, guids] of entitiesByAccount.entries()) {
          const guidSet = new Set(guids);
          const query = composeIssuesNrqlQuery(accountId);
          const { data: queryData, error: queryError } =
            await NerdGraphQuery.query({ query });
          if (fetchId !== fetchIdRef.current) return;
          if (queryError) throw queryError;

          const rows = queryData?.actor?.account?.nrql?.results || [];
          if (rows.length >= NRQL_LIMIT_MAX) {
            // eslint-disable-next-line no-console
            console.warn(
              `${LOG_PREFIX} account ${accountId} returned ${rows.length} rows; results may be truncated by NRQL LIMIT MAX`
            );
          }

          rows.forEach((row) => {
            const issue = mapNrqlRowToIssue(row, accountId);
            if (issue.state === 'CLOSED') {
              droppedClosed += 1;
              return;
            }
            const touches = issue.entityGuids.some((g) => guidSet.has(g));
            if (!touches) {
              droppedNoMatch += 1;
              return;
            }
            allIssues.push(issue);
          });
        }
        if (fetchId !== fetchIdRef.current) return;
        // eslint-disable-next-line no-console
        console.log(
          `${LOG_PREFIX} done: ${allIssues.length} active issue(s), ${droppedClosed} closed dropped, ${droppedNoMatch} non-matching dropped`
        );
        setIssuesData(issuesByEntity(allIssues));
        setLoading(false);
      } catch (e) {
        if (fetchId !== fetchIdRef.current) return;
        // eslint-disable-next-line no-console
        console.error(`${LOG_PREFIX} query error`, e);
        setError(e);
        setLoading(false);
      }
    })();
  }, [entitiesByAccount, sig]);

  const results = useMemo(() => {
    if (!data || data.length === 0) return data || [];
    if (!issuesData) return issuesTree(data, new Map());
    return issuesTree(data, issuesData);
  }, [data, issuesData]);

  return {
    data: results,
    loading,
    error,
  };
};

export default useAlertingEntitiesIssues;
