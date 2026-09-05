import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

import { Icon } from 'nr1';

// Resolves the owning team(s) for an entity from its tags. Prefers the
// NR-managed `nr.teamGuid` tag (multi-valued) so we can link to the real Team
// entity; falls back to the human-readable `team` tag value as a plain,
// non-clickable pill when NR's Entity Ownership discovery hasn't stamped a guid.
const resolveTeams = (tags, teamEntitiesByGuid) => {
  const valuesFor = (key) =>
    (tags || []).find((t) => t?.key === key)?.values?.filter(Boolean) ?? [];
  const teamGuids = valuesFor('nr.teamGuid');
  const teamNames = valuesFor('team');

  if (teamGuids.length) {
    return teamGuids.map((guid, i) => {
      const entity = teamEntitiesByGuid?.[guid];
      return {
        key: guid,
        guid,
        accountId: entity?.accountId,
        // Until the entity hydrates (or if it's since been deleted), fall back
        // to a `team` tag name rather than showing a raw guid.
        name: entity?.name || teamNames[i] || teamNames[0] || 'Team',
        clickable: !!entity,
      };
    });
  }

  return teamNames.map((teamName) => ({
    key: teamName,
    name: teamName,
    clickable: false,
  }));
};

// Renders an owning-team pill per team. Shared by WorkloadCard and EntityRow so
// the badge looks and behaves identically wherever ownership is shown. Resolved
// teams link through to their Team entity via `onTeamClick`.
const TeamBadges = ({ tags, teamEntitiesByGuid = {}, onTeamClick }) => {
  const teams = useMemo(
    () => resolveTeams(tags, teamEntitiesByGuid),
    [tags, teamEntitiesByGuid]
  );

  if (teams.length === 0) return null;

  const handleClick = (e, team) => {
    // Stop the row/card drill-in click from firing when the pill is clicked.
    e.stopPropagation();
    onTeamClick?.({ guid: team.guid, accountId: team.accountId });
  };

  return (
    <>
      {teams.map((team) =>
        team.clickable ? (
          <button
            key={team.key}
            type="button"
            className="u-unstyledButton team-pill clickable"
            title={`Open team: ${team.name}`}
            onClick={(e) => handleClick(e, team)}
          >
            <Icon
              className="team-pill-icon"
              type={Icon.TYPE.PROFILES__USERS__TEAM}
            />
            {team.name}
          </button>
        ) : (
          <span
            key={team.key}
            className="team-pill"
            title={`Owning team: ${team.name}`}
          >
            <Icon
              className="team-pill-icon"
              type={Icon.TYPE.PROFILES__USERS__TEAM}
            />
            {team.name}
          </span>
        )
      )}
    </>
  );
};

TeamBadges.propTypes = {
  tags: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      values: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  teamEntitiesByGuid: PropTypes.object,
  onTeamClick: PropTypes.func,
};

export default TeamBadges;
