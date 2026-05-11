import { useEffect, useMemo, useState } from 'react';
import { useNerdGraphQuery } from 'nr1';

import {
  alertingEntitiesByAccount,
  composeIssuesQuery,
  extractIssues,
  issuesByEntity,
  issuesTree,
} from '../utils';

const useAlertingEntitiesIssues = ({ data, skip }) => {
  const [issuesData, setIssuesData] = useState(null);

  const query = useMemo(() => {
    if (skip) {
      return null;
    }
    const entitiesByAccount = alertingEntitiesByAccount(data);
    if (entitiesByAccount.size === 0) {
      return null;
    }
    return composeIssuesQuery(entitiesByAccount);
  }, [data, skip]);

  const {
    data: queryData,
    loading: queryLoading,
    error: queryError,
  } = useNerdGraphQuery({
    query: query || '{ actor { user { timeZoneName } } }',
    skip: !query,
  });

  useEffect(() => {
    if (!queryData) return;
    const allIssues = extractIssues(queryData);
    setIssuesData(issuesByEntity(allIssues));
  }, [queryData]);

  const results = useMemo(() => {
    if (!data || data.length === 0) return data || [];
    if (!issuesData) {
      return issuesTree(data, new Map());
    }
    return issuesTree(data, issuesData);
  }, [data, issuesData]);

  return {
    data: results,
    loading: queryLoading,
    error: queryError,
  };
};

export default useAlertingEntitiesIssues;
