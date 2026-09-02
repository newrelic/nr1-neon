import React from 'react';
import PropTypes from 'prop-types';

import { EmptyState } from 'nr1';

import Breadcrumb from '../breadcrumb';
import WorkloadGrid from '../workload-grid';
import EntitiesView from '../entities-view';
import IssuesList from '../issues-list';
import Modal from '../modal';
import SettingsModal from '../settings-modal';
import WorkloadsModal from '../workloads-modal';

// Presentational shell for a loaded board: the drill-down grid + entities, plus
// the four board modals. All state and handlers are supplied by the container.
const BoardView = ({
  navigationStack,
  gridData,
  entities,
  hydratedEntities,
  entitiesHydrating,
  activeTab,
  dataLoading,
  issuesLoading,
  hideUnacknowledged,
  onCardClick,
  onIssuesClick,
  onChipClick,
  onHomeClick,
  onEntityClick,
  onTabChange,
  onOpenWorkloads,
  issuesWorkload,
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
            <WorkloadGrid
              workloads={gridData}
              issuesLoading={dataLoading || issuesLoading}
              hideUnacknowledged={hideUnacknowledged}
              onCardClick={onCardClick}
              onIssuesClick={onIssuesClick}
            />
            <EntitiesView
              entities={hydratedEntities}
              loading={entitiesHydrating}
              onEntityClick={onEntityClick}
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
        />
      )}

      <SettingsModal
        onSave={settingsModal.onSave}
        onDelete={settingsModal.onDelete}
        onSetDefault={settingsModal.onSetDefault}
        isSettingsModalOpen={settingsModal.isOpen}
        setIsSettingsModalOpen={settingsModal.setIsOpen}
        savedTitle={settingsModal.savedTitle}
        savedDescription={settingsModal.savedDescription}
        savedHideUnacknowledged={settingsModal.savedHideUnacknowledged}
        savedIsDefault={settingsModal.savedIsDefault}
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
        <IssuesList workload={issuesWorkload} />
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
        />
      </Modal>
    </>
  );
};

BoardView.propTypes = {
  navigationStack: PropTypes.array,
  gridData: PropTypes.array,
  entities: PropTypes.array,
  hydratedEntities: PropTypes.array,
  entitiesHydrating: PropTypes.bool,
  activeTab: PropTypes.string,
  dataLoading: PropTypes.bool,
  issuesLoading: PropTypes.bool,
  hideUnacknowledged: PropTypes.bool,
  onCardClick: PropTypes.func,
  onIssuesClick: PropTypes.func,
  onChipClick: PropTypes.func,
  onHomeClick: PropTypes.func,
  onEntityClick: PropTypes.func,
  onTabChange: PropTypes.func,
  onOpenWorkloads: PropTypes.func,
  issuesWorkload: PropTypes.object,
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
