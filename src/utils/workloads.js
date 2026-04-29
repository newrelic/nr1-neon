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
