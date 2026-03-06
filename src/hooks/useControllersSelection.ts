import { useMemo } from 'react';
import { Controller, ControllerSelection } from '../types';

const CONTROLLERS: Controller[] = [
  {
    id: 'tb2',
    name: 'TB2',
    portCount: 1,
    pixelCapacity: 0.65,
    type: 'asynchronous',
    minPortsForRedundancy: 0, // Cannot support redundancy
  },
  {
    id: 'tb40',
    name: 'TB40',
    portCount: 2,
    pixelCapacity: 1.3,
    type: 'asynchronous',
    minPortsForRedundancy: 2, // Minimum for 1 datahub + 1 backup
    inputs: 1,
    outputs: 3,
    maxResolution: '1920×1080@60Hz',
  },
  {
    id: 'tb60',
    name: 'TB60',
    portCount: 4,
    pixelCapacity: 2.3,
    type: 'asynchronous',
    minPortsForRedundancy: 2,
    inputs: 1,
    outputs: 5,
    maxResolution: '1920×1080@60Hz',
  },
  {
    id: 'vx1',
    name: 'VX1',
    portCount: 2,
    pixelCapacity: 1.3,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 5,
    outputs: 2,
    maxResolution: '1920×1080@60Hz',
  },
  {
    id: 'vx400',
    name: 'VX400',
    portCount: 4,
    pixelCapacity: 2.6,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 5,
    outputs: 4,
    maxResolution: '1920×1200@60Hz',
  },
  {
    id: 'vx400pro',
    name: 'VX400 Pro',
    portCount: 4,
    pixelCapacity: 2.6,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 5,
    outputs: 4,
    maxResolution: '4096×2160@60Hz (4K)',
  },
  {
    id: 'vx600',
    name: 'VX600',
    portCount: 6,
    pixelCapacity: 3.9,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 5,
    outputs: 6,
    maxResolution: '1920×1200@60Hz',
  },
  {
    id: 'vx600pro',
    name: 'VX600 Pro',
    portCount: 6,
    pixelCapacity: 3.9,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 5,
    outputs: 6,
    maxResolution: '4096×2160@60Hz (4K)',
  },
  {
    id: 'vx1000',
    name: 'VX1000',
    portCount: 10,
    pixelCapacity: 6.5,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 6,
    outputs: 10,
    maxResolution: '3840×2160@30Hz',
  },
  {
    id: 'vx1000pro',
    name: 'VX1000 Pro',
    portCount: 10,
    pixelCapacity: 6.5,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 5,
    outputs: 10,
    maxResolution: '4096×2160@60Hz (True 4K@60)',
  },
  {
    id: 'vx16s',
    name: 'VX16S',
    portCount: 16,
    pixelCapacity: 10,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 7,
    outputs: 16,
    maxResolution: '3840×2160@60Hz',
  },
  {
    id: 'vx2000pro',
    name: 'VX2000pro',
    portCount: 25,
    pixelCapacity: 13,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 10,
    outputs: 25,
    maxResolution: '4096×2160@60Hz (4K)',
  },
  {
    id: 'tu15pro',
    name: 'TU15PRO',
    portCount: 5,
    pixelCapacity: 2.6,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 2,
    outputs: 5,
    maxResolution: '2048×1152@60Hz',
  },
  {
    id: 'tu20pro',
    name: 'TU20PRO',
    portCount: 7,
    pixelCapacity: 3.9,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 2,
    outputs: 7,
    maxResolution: '2048×1152@60Hz',
  },
  {
    id: 'tu4kpro',
    name: 'TU4k pro',
    portCount: 23,
    pixelCapacity: 13,
    type: 'synchronous',
    minPortsForRedundancy: 2,
    inputs: 3,
    outputs: 23,
    maxResolution: '4096×2160@60Hz',
  },
];

export const useControllerSelection = (
  dataHubPorts: number,
  totalPixels: number,
  isRedundancyMode: boolean
): ControllerSelection => {
  return useMemo(() => {
    const primaryPorts = dataHubPorts;
    const backupPorts = isRedundancyMode ? dataHubPorts : 0;
    const requiredPorts = isRedundancyMode ? primaryPorts + backupPorts : primaryPorts; // = 2 * dataHubPorts when redundancy

    console.log({
      redundancyEnabled: isRedundancyMode,
      dataHubPorts,
      primaryPorts,
      backupPorts,
      requiredPorts,
    });

    let computedRequiredPorts: number;
    let computedBackupPorts: number;

    if (isRedundancyMode) {
      computedRequiredPorts = requiredPorts; // 2 * dataHubPorts
      computedBackupPorts = backupPorts; // dataHubPorts

      // Redundancy: only controllers that support redundancy (minPortsForRedundancy >= 2)
      const availableControllers = CONTROLLERS.filter(
        (ctrl) => ctrl.minPortsForRedundancy >= 2 && ctrl.portCount >= computedRequiredPorts
      );

      // First pick by port count (requiredPorts), then by pixel capacity
      const selectedController = availableControllers.find(
        (ctrl) => ctrl.portCount >= computedRequiredPorts && ctrl.pixelCapacity * 1000000 >= totalPixels
      )
        ?? availableControllers.find((ctrl) => ctrl.portCount >= computedRequiredPorts);
      
      if (selectedController) {
        // If selected controller has insufficient pixel capacity, pick smallest controller that has both enough ports and enough pixels
        if (totalPixels > selectedController.pixelCapacity * 1000000) {
          const portAndPixelCapable = availableControllers.filter(
            (ctrl) =>
              ctrl.portCount >= computedRequiredPorts &&
              ctrl.pixelCapacity * 1000000 >= totalPixels
          );
          if (portAndPixelCapable.length > 0) {
            const bestController = portAndPixelCapable.sort((a, b) => {
              if (a.portCount !== b.portCount) return a.portCount - b.portCount;
              return a.pixelCapacity - b.pixelCapacity;
            })[0];
            return {
              selectedController: bestController,
              requiredPorts: computedRequiredPorts,
              totalPixels,
              isRedundancyMode,
              dataHubPorts,
              backupPorts: computedBackupPorts,
            };
          }
        }
        return {
          selectedController,
          requiredPorts: computedRequiredPorts,
          totalPixels,
          isRedundancyMode,
          dataHubPorts,
          backupPorts: computedBackupPorts,
        };
      }
    } else {
      computedRequiredPorts = dataHubPorts;
      computedBackupPorts = 0;

      const selectedController = CONTROLLERS.find(
        (ctrl) => ctrl.portCount >= computedRequiredPorts
      );
      
      if (selectedController) {
        if (totalPixels > selectedController.pixelCapacity * 1000000) {
          const pixelCapableControllers = CONTROLLERS.filter(
            (ctrl) =>
              ctrl.portCount >= computedRequiredPorts &&
              ctrl.pixelCapacity * 1000000 >= totalPixels
          );
          if (pixelCapableControllers.length > 0) {
            const bestController = pixelCapableControllers.sort((a, b) => {
              if (a.portCount !== b.portCount) return a.portCount - b.portCount;
              return a.pixelCapacity - b.pixelCapacity;
            })[0];
            return {
              selectedController: bestController,
              requiredPorts: computedRequiredPorts,
              totalPixels,
              isRedundancyMode,
              dataHubPorts,
              backupPorts: computedBackupPorts,
            };
          }
        }
        return {
          selectedController,
          requiredPorts: computedRequiredPorts,
          totalPixels,
          isRedundancyMode,
          dataHubPorts,
          backupPorts: computedBackupPorts,
        };
      }
    }

    const fallbackController = CONTROLLERS[CONTROLLERS.length - 1];
    return {
      selectedController: fallbackController,
      requiredPorts: isRedundancyMode ? computedRequiredPorts : fallbackController.portCount,
      totalPixels,
      isRedundancyMode,
      dataHubPorts,
      backupPorts: isRedundancyMode ? dataHubPorts : 0,
    };
  }, [dataHubPorts, totalPixels, isRedundancyMode]);
};

export { CONTROLLERS };