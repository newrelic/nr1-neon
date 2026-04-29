import { threeDaysAgo } from './datetime';
import { ENTITY_BATCH_SIZE, ISSUE_FIELDS } from '../constants';

const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const composeIssuesQuery = (accountEntities) => {
  const accountFragments = [];
  let accountIdx = 0;

  for (const [accountId, guids] of accountEntities.entries()) {
    accountIdx += 1;
    const guidChunks = chunk(guids, ENTITY_BATCH_SIZE);
    const issueFragments = guidChunks
      .map((batch, batchIdx) => {
        const guidList = batch.map((g) => `"${g}"`).join(', ');
        return `
          e${batchIdx + 1}: issues(
            cursor: null
            filter: { entityGuids: [${guidList}] }
            timeWindow: {endTime: ${Date.now()}, startTime: ${threeDaysAgo()}}
          ) {
            issues { ${ISSUE_FIELDS} }
            nextCursor
          }
        `;
      })
      .join('\n');

    accountFragments.push(`
      a${accountIdx}: account(id: ${accountId}) {
        aiIssues {
          ${issueFragments}
        }
      }
    `);
  }

  return `{ actor { ${accountFragments.join('\n')} } }`;
};

export const extractIssues = (queryData) => {
  const issues = [];
  let hasNext = false;

  const accounts = queryData?.actor || {};
  Object.keys(accounts).forEach((accountKey) => {
    if (!accountKey.startsWith('a')) return;
    const aiIssues = accounts[accountKey]?.aiIssues || {};
    Object.keys(aiIssues).forEach((entityKey) => {
      if (!entityKey.startsWith('e')) return;
      const block = aiIssues[entityKey];
      if (block?.nextCursor) hasNext = true;
      (block?.issues || []).forEach((issue) => issues.push(issue));
    });
  });

  if (hasNext) {
    // eslint-disable-next-line no-console
    console.warn('Not all issues have been accounted for...');
  }

  return issues;
};

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
