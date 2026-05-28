import { threeDaysAgo } from './datetime';
import { ISSUE_FIELDS } from '../constants';

export const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const composeAccountIssuesQuery = (accountId, guids, cursor) => {
  const guidList = guids.map((g) => `"${g}"`).join(', ');
  const cursorArg = cursor ? `"${cursor}"` : 'null';
  return `{
    actor {
      account(id: ${accountId}) {
        aiIssues {
          issues(
            cursor: ${cursorArg}
            filter: { entityGuids: [${guidList}], states: [ACTIVATED] }
            timeWindow: { endTime: ${Date.now()}, startTime: ${threeDaysAgo()} }
          ) {
            issues { ${ISSUE_FIELDS} }
            nextCursor
          }
        }
      }
    }
  }`;
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
