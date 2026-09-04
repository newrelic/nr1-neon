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

// Walks a node (or array of nodes) and its `children` recursively, returning
// a guid -> name map for every node that has both.
export const buildEntityNameMap = (nodes) => {
  const map = new Map();
  const walk = (list) => {
    (list || []).forEach((node) => {
      if (node?.guid && node?.name) map.set(node.guid, node.name);
      if (node?.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return map;
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
