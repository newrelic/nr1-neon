export const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const ISSUE_NRQL_PROJECTION = [
  'latest(event) AS event',
  'latest(issueLink) AS issueLink',
  'latest(title) AS title',
  'latest(priority) AS priority',
  'latest(muted) AS muted',
  'latest(closeCause) AS closeCause',
  'latest(acknowledgeTime) AS acknowledgeTime',
  'latest(activateTime) AS activateTime',
  'latest(createTime) AS createTime',
  'latest(closeTime) AS closeTime',
  'latest(`entity.guids`) AS entityGuids',
  'latest(incidentIds) AS incidentIds',
  'latest(isIdle) AS isIdle',
  'latest(correlated) AS correlated',
  'latest(timestamp) AS lastEventAt',
].join(', ');

export const composeIssuesNrqlQuery = (accountId) => {
  const nrql = `SELECT ${ISSUE_NRQL_PROJECTION} FROM NrAiIssue SINCE 3 days ago FACET issueId LIMIT MAX`;
  const escaped = nrql.replace(/"/g, '\\"');
  return `{
    actor {
      account(id: ${accountId}) {
        nrql(query: "${escaped}") {
          results
        }
      }
    }
  }`;
};

const toMs = (n) => (typeof n === 'number' && n > 0 ? n : null);

export const mapNrqlRowToIssue = (row, accountId) => ({
  issueId: row?.facet,
  issueLink: row?.issueLink,
  title: row?.title,
  priority: row?.priority,
  muted: row?.muted,
  closeCause: row?.closeCause,
  acknowledgedAt: toMs(row?.acknowledgeTime),
  activatedAt: toMs(row?.activateTime),
  createdAt: toMs(row?.createTime),
  closedAt: toMs(row?.closeTime),
  entityGuids: Array.isArray(row?.entityGuids) ? row.entityGuids : [],
  incidentIds: Array.isArray(row?.incidentIds) ? row.incidentIds : [],
  isCorrelated: !!row?.correlated,
  isIdle: !!row?.isIdle,
  state: row?.event === 'close' ? 'CLOSED' : 'ACTIVATED',
  accountId,
});

export const issuesByEntity = (issues) => {
  const map = new Map();
  issues.forEach((issue) => {
    (issue.entityGuids || []).forEach((guid) => {
      if (!map.has(guid)) map.set(guid, []);
      map.get(guid).push(issue);
    });
  });
  return map;
};

export const issuesTree = (nodes, entityIssues) => {
  return nodes.map((node) => {
    const newChildren = node.children
      ? issuesTree(node.children, entityIssues)
      : undefined;

    const ownIssues = entityIssues.get(node.guid) || [];

    const seen = new Set();
    const allIssues = [];
    const push = (issue) => {
      if (issue?.issueId && !seen.has(issue.issueId)) {
        seen.add(issue.issueId);
        allIssues.push(issue);
      }
    };
    ownIssues.forEach(push);
    if (newChildren) {
      newChildren.forEach((child) => (child.issues || []).forEach(push));
    }

    return {
      guid: node.guid,
      ...(newChildren ? { children: newChildren } : {}),
      issues: allIssues,
    };
  });
};
