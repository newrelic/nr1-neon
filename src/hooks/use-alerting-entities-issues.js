import { useEffect, useMemo, useRef, useState } from 'react';
import { NerdGraphQuery } from 'nr1';

import {
  alertingEntitiesByAccount,
  chunk,
  composeAccountIssuesQuery,
  issuesByEntity,
  issuesTree,
} from '../utils';
import { ENTITY_BATCH_SIZE } from '../constants';

const useAlertingEntitiesIssues = ({ data, skip }) => {
  const [issuesData, setIssuesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchIdRef = useRef(0);

  const entitiesByAccount = useMemo(() => {
    if (skip) return null;
    const map = alertingEntitiesByAccount(data);
    return map.size === 0 ? null : map;
  }, [data, skip]);

  useEffect(() => {
    if (!entitiesByAccount) {
      setIssuesData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    (async () => {
      const allIssues = [];
      try {
        for (const [accountId, guids] of entitiesByAccount.entries()) {
          for (const batch of chunk(guids, ENTITY_BATCH_SIZE)) {
            let cursor = null;
            do {
              const query = composeAccountIssuesQuery(accountId, batch, cursor);
              const { data: queryData, error: queryError } =
                await NerdGraphQuery.query({ query });
              if (fetchId !== fetchIdRef.current) return;
              if (queryError) throw queryError;

              const block = queryData?.actor?.account?.aiIssues?.issues;
              (block?.issues || []).forEach((issue) => allIssues.push(issue));
              cursor = block?.nextCursor || null;
            } while (cursor);
          }
        }
        if (fetchId !== fetchIdRef.current) return;
        setIssuesData(issuesByEntity(allIssues));
        setLoading(false);
      } catch (e) {
        if (fetchId !== fetchIdRef.current) return;
        setError(e);
        setLoading(false);
      }
    })();
  }, [entitiesByAccount]);

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
