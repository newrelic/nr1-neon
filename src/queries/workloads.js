export const getWorkloadsStatusQuery = (guids, accountIds) => `
  {
    actor {
      nrql(accounts: [${accountIds.join(
        ','
      )}], query: "SELECT latest(statusValue) FROM WorkloadStatus WHERE workloadGuid IN ('${guids.join(
  "', '"
)}') FACET workloadGuid LIMIT MAX") {
        results
      }
    }
  }
`;
