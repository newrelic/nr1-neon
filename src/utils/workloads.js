import { WORKLOAD_STATUSES } from '../constants';

export const mergeData = (workloadsTree, issuesTree) => {
  if (!workloadsTree) return [];
  return workloadsTree.map((node, i) => {
    const issuesNode = issuesTree?.[i];
    return {
      ...node,
      issues: issuesNode?.issues ?? [],
      children: node.children
        ? mergeData(node.children, issuesNode?.children)
        : [],
    };
  });
};

export const countEntities = (workload) => {
  return Array.isArray(workload?.children) ? workload.children.length : 0;
};

export const workloadStatusClass = ({ status } = {}) => {
  if (status === WORKLOAD_STATUSES.OPERATIONAL) return 'success';
  if (status === WORKLOAD_STATUSES.DEGRADED) return 'warning';
  if (status === WORKLOAD_STATUSES.DISRUPTED) return 'critical';
  if (status === WORKLOAD_STATUSES.UNKNOWN) return 'unknown';
  return 'unknown';
};
