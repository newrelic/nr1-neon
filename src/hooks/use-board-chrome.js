import { useEffect } from 'react';

import { Icon, navigation, nerdlet } from 'nr1';

// Drives the platform header + action buttons for a board. When the board is
// missing it reverts the header to the Nexus default rather than leaving a
// stale/placeholder title behind.
export const useBoardChrome = ({
  boardMissing,
  docLoading,
  title,
  onRefresh,
  onOpenWorkloads,
  onOpenSettings,
}) => {
  useEffect(() => {
    if (docLoading) return; // wait until we know whether the board exists

    if (boardMissing) {
      nerdlet.setConfig({
        accountPicker: true,
        accountPickerValues: [...nerdlet.ACCOUNT_PICKER_DEFAULT_VALUES],
        timePicker: false,
        actionControls: false,
        actionControlButtons: [],
        headerTitle: 'Nexus',
        headerParentTitle: undefined,
        headerParentLocation: undefined,
      });
      return;
    }

    nerdlet.setConfig({
      accountPicker: true,
      accountPickerValues: [...nerdlet.ACCOUNT_PICKER_DEFAULT_VALUES],
      actionControls: true,
      actionControlButtons: [
        {
          label: 'Refresh',
          hint: 'Reload all workload data',
          iconType: Icon.TYPE.INTERFACE__OPERATIONS__REDO,
          onClick: onRefresh,
        },
        {
          label: 'Workloads',
          hint: 'Choose the workloads shown on this board',
          iconType: Icon.TYPE.HARDWARE_AND_SOFTWARE__SOFTWARE__WORKLOADS,
          onClick: onOpenWorkloads,
        },
        {
          label: 'Settings',
          hint: 'Edit settings for the board',
          iconType: Icon.TYPE.INTERFACE__OPERATIONS__CONFIGURE,
          onClick: onOpenSettings,
        },
      ],
      timePicker: false,
      headerTitle: title || 'Nexus',
      headerParentTitle: 'Nexus',
      // getOpenNerdletLocation returns a location descriptor WITHOUT navigating.
      // openNerdlet() would navigate immediately on mount and wipe boardId.
      headerParentLocation: navigation.getOpenNerdletLocation({
        id: 'nexus',
        urlState: { boardId: null },
      }),
    });
  }, [
    onOpenSettings,
    onOpenWorkloads,
    onRefresh,
    title,
    boardMissing,
    docLoading,
  ]);
};

export default useBoardChrome;
