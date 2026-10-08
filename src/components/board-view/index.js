import React from 'react';
import PropTypes from 'prop-types';

import { EmptyState } from 'nr1';

import Breadcrumb from '../breadcrumb';
import WorkloadGrid from '../workload-grid';
import WorkloadTriage from '../workload-triage';
import EntitiesView from '../entities-view';
import IssuesList from '../issues-list';
import Modal from '../modal';
import SettingsModal from '../settings-modal';
import WorkloadsModal from '../workloads-modal';
import { TRIAGE_THRESHOLD } from '../../constants';

// Presentational shell for a loaded board: the drill-down grid + entities, plus
// the four board modals. All state and handlers are supplied by the container.
const BoardView = ({
  navigationStack,
  gridData,
  tagsByGuid,
  teamEntitiesByGuid,
  issueEntityTagsByGuid,
  onTeamClick,
  entities,
  hydratedEntities,
  entitiesHydrating,
  activeTab,
  dataLoading,
  issuesLoading,
  hideUnacknowledged,
  issuesVariant,
  onCardClick,
  onIssuesClick,
  onChipClick,
  onHomeClick,
  onEntityClick,
  onTabChange,
  onOpenWorkloads,
  emptyState,
  issuesWorkload,
  entityNameByGuid,
  workloadAncestorNames,
  onCloseWorkloadIssues,
  issuesEntity,
  onCloseEntityIssues,
  onOpenEntity,
  settingsModal,
  workloadsModal,
}) => {
  // Key the content gate off the pre-hydration entities so the grid only mounts
  // once there's genuinely something to show (hydratedEntities can lag behind).
  const hasContent =
    gridData?.length || entities?.length || navigationStack.length > 0;
  const LevelView =
    (gridData?.length ?? 0) > TRIAGE_THRESHOLD ? WorkloadTriage : WorkloadGrid;

  return (
    <>
      {hasContent ? (
        <div className="container">
          <div className="main">
            <Breadcrumb
              levels={navigationStack}
              onChipClick={onChipClick}
              onHomeClick={onHomeClick}
            />
            <LevelView
              // Remount per level so search, filters and paging start fresh
              // each time the user drills in or out.
              key={
                LevelView === WorkloadTriage
                  ? navigationStack.map((l) => l.activeId).join('/') || 'root'
                  : 'grid'
              }
              workloads={gridData}
              tagsByGuid={tagsByGuid}
              teamEntitiesByGuid={teamEntitiesByGuid}
              issuesLoading={dataLoading || issuesLoading}
              hideUnacknowledged={hideUnacknowledged}
              issuesVariant={issuesVariant}
              onCardClick={onCardClick}
              onIssuesClick={onIssuesClick}
              onTeamClick={onTeamClick}
            />
            <EntitiesView
              entities={hydratedEntities}
              loading={entitiesHydrating}
              teamEntitiesByGuid={teamEntitiesByGuid}
              onEntityClick={onEntityClick}
              onTeamClick={onTeamClick}
              activeType={activeTab}
              onTabChange={onTabChange}
            />
          </div>
        </div>
      ) : (
        <EmptyState
          fullHeight
          fullWidth
          type={EmptyState.TYPE.USER_CLEARED}
          illustrationType={EmptyState.ILLUSTRATION_TYPE.ILLUSTRATION_03}
          title="Nothing brewing. Yet."
          description="No Workloads. To get started, click the Workloads button."
          action={{ label: 'Workloads', onClick: onOpenWorkloads }}
          {...(emptyState || {})}
        />
      )}

      <SettingsModal
        onSave={settingsModal.onSave}
        onDelete={settingsModal.onDelete}
        onSetDefault={settingsModal.onSetDefault}
        onSetIssuesStyle={settingsModal.onSetIssuesStyle}
        isSettingsModalOpen={settingsModal.isOpen}
        setIsSettingsModalOpen={settingsModal.setIsOpen}
        savedTitle={settingsModal.savedTitle}
        savedDescription={settingsModal.savedDescription}
        savedHideUnacknowledged={settingsModal.savedHideUnacknowledged}
        savedIsDefault={settingsModal.savedIsDefault}
        savedIssuesStyle={settingsModal.savedIssuesStyle}
        otherDefaultBoardTitle={settingsModal.otherDefaultBoardTitle}
      />
      <WorkloadsModal
        onSave={workloadsModal.onSave}
        isWorkloadsModalOpen={workloadsModal.isOpen}
        setIsWorkloadsModalOpen={workloadsModal.setIsOpen}
        savedWorkloads={workloadsModal.savedWorkloads}
      />
      <Modal
        hidden={!issuesWorkload}
        onClose={onCloseWorkloadIssues}
        style={{ '--modal-width': '480px', '--modal-padding': '0' }}
      >
        <IssuesList
          workload={issuesWorkload}
          entityNameByGuid={entityNameByGuid}
          ancestorNames={workloadAncestorNames}
          entityTagsByGuid={issueEntityTagsByGuid}
          teamEntitiesByGuid={teamEntitiesByGuid}
          onTeamClick={onTeamClick}
        />
      </Modal>
      <Modal
        hidden={!issuesEntity}
        onClose={onCloseEntityIssues}
        style={{ '--modal-width': '480px', '--modal-padding': '0' }}
      >
        <IssuesList
          workload={{ ...issuesEntity, status: issuesEntity?.alertSeverity }}
          subjectLabel="Entity"
          onOpenEntity={() => onOpenEntity(issuesEntity)}
          entityTagsByGuid={issueEntityTagsByGuid}
          teamEntitiesByGuid={teamEntitiesByGuid}
          onTeamClick={onTeamClick}
        />
      </Modal>
    </>
  );
};

BoardView.propTypes = {
  navigationStack: PropTypes.array,
  gridData: PropTypes.array,
  tagsByGuid: PropTypes.object,
  teamEntitiesByGuid: PropTypes.object,
  issueEntityTagsByGuid: PropTypes.object,
  onTeamClick: PropTypes.func,
  entities: PropTypes.array,
  hydratedEntities: PropTypes.array,
  entitiesHydrating: PropTypes.bool,
  activeTab: PropTypes.string,
  dataLoading: PropTypes.bool,
  issuesLoading: PropTypes.bool,
  hideUnacknowledged: PropTypes.bool,
  issuesVariant: PropTypes.oneOf(['solid']),
  onCardClick: PropTypes.func,
  onIssuesClick: PropTypes.func,
  onChipClick: PropTypes.func,
  onHomeClick: PropTypes.func,
  onEntityClick: PropTypes.func,
  onTabChange: PropTypes.func,
  onOpenWorkloads: PropTypes.func,
  // Overrides the default "no workloads yet" empty state (type, title,
  // description, action), e.g. when the board's workloads failed to load.
  emptyState: PropTypes.object,
  issuesWorkload: PropTypes.object,
  entityNameByGuid: PropTypes.instanceOf(Map),
  workloadAncestorNames: PropTypes.array,
  onCloseWorkloadIssues: PropTypes.func,
  issuesEntity: PropTypes.object,
  onCloseEntityIssues: PropTypes.func,
  onOpenEntity: PropTypes.func,
  // Grouped prop bags for the board-doc modals; contents are wired straight
  // through to SettingsModal / WorkloadsModal.
  settingsModal: PropTypes.object,
  workloadsModal: PropTypes.object,
};

export default BoardView;
