import { useCallback, useMemo } from 'react';

import { useAccountStorageMutation, useAccountStorageQuery } from 'nr1';

import useDataManager from './use-data-manager';
import useAlertingEntitiesIssues from './use-alerting-entities-issues';
import { mergeData } from '../utils';
import { BOARDS_STORE } from '../constants';

// Board data layer: loads the board document, its workload statuses and the
// alerting issues for those workloads, and exposes a merged `rootGrid` (the
// top-level workload grid) plus a merge-write helper for the board doc.
export const useBoardData = (boardId, accountId) => {
  const {
    loading: docLoading,
    error: docError,
    data: docData,
  } = useAccountStorageQuery({
    accountId,
    ...BOARDS_STORE,
    documentId: boardId,
    skip: !accountId || !boardId,
  });

  const [docWrite] = useAccountStorageMutation({
    actionType: useAccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
  });

  const workloadGuids = useMemo(
    () => docData?.start?.map(({ guid }) => guid) || [],
    [docData]
  );

  const {
    loading: dataLoading,
    error: dataError,
    data,
    refresh: refreshData,
  } = useDataManager(workloadGuids);

  const {
    data: issuesData,
    loading: issuesLoading,
    error: issuesError,
  } = useAlertingEntitiesIssues({
    data,
    skip: dataLoading || !data || data.length === 0,
  });

  const rootGrid = useMemo(
    () => mergeData(data, issuesData),
    [data, issuesData]
  );

  // A board document is missing once the query has settled with no data.
  const boardMissing = !docLoading && !docError && !docData;

  // Merge-write the board doc: preserve identity/metadata, patch only the given fields.
  const writeBoard = useCallback(
    async (patch) => {
      const { error } = await docWrite({
        accountId,
        ...BOARDS_STORE,
        documentId: boardId,
        document: { ...(docData || {}), id: boardId, ...patch },
      });
      return { error };
    },
    [accountId, boardId, docData, docWrite]
  );

  return {
    docLoading,
    docError,
    docData,
    boardMissing,
    data,
    dataLoading,
    dataError,
    refreshData,
    issuesData,
    issuesLoading,
    issuesError,
    workloadGuids,
    rootGrid,
    writeBoard,
  };
};

export default useBoardData;
