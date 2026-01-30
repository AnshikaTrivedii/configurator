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
  },
  {
    id: 'tb60',
    name: 'TB60',
    portCount: 4,
    pixelCapacity: 2.3,
    type: 'asynchronous',
    minPortsForRedundancy: 2,
  },
  {
    id: 'vx1',
    name: 'VX1',
    portCount: 2,
    pixelCapacity: 1.3,
    type: 'synchronous',
    minPortsForRedundancy: 2,
  },
  {
    id: 'vx400',
    name: 'VX400',
    portCount: 4,
    pixelCapacity: 2.6,
    type: 'synchronous',
    minPortsForRedundancy: 2,
  },
  {
    id: 'vx600',
    name: 'VX600',
    portCount: 6,
    pixelCapacity: 3.9,
    type: 'synchronous',
    minPortsForRedundancy: 2,
  },
  {
    id: 'vx1000',
    name: 'VX1000',
    portCount: 10,
    pixelCapacity: 6.5,
    type: 'synchronous',
    minPortsForRedundancy: 2,
  },
  {
    id: '4k-prime',
    name: '4K Prime',
    portCount: 16,
    pixelCapacity: 13,
    type: 'synchronous',
    minPortsForRedundancy: 2,
  },
];

export const useControllerSelection = (
  dataHubPorts: number,
  totalPixels: number,
  isRedundancyMode: boolean
): ControllerSelection => {
  return useMemo(() => {

    let requiredPorts: number;
    let backupPorts: number;
    
    if (isRedundancyMode) {

      requiredPorts = dataHubPorts * 2;
      backupPorts = dataHubPorts;

      const availableControllers = CONTROLLERS.filter(ctrl => ctrl.minPortsForRedundancy > 0);

      const selectedController = availableControllers.find(ctrl => ctrl.portCount >= requiredPorts);
      
      if (selectedController) {

        if (totalPixels > selectedController.pixelCapacity * 1000000) {

          const pixelCapableControllers = availableControllers.filter(
            ctrl => ctrl.pixelCapacity * 1000000 >= totalPixels
          );
          
          if (pixelCapableControllers.length > 0) {

            const bestController = pixelCapableControllers.sort((a, b) => {
              if (a.portCount !== b.portCount) {
                return a.portCount - b.portCount; // Prefer fewer ports
              }
              return a.pixelCapacity - b.pixelCapacity; // Then prefer lower pixel capacity
            })[0];
            
            return {
              selectedController: bestController,
              requiredPorts,
              totalPixels,
              isRedundancyMode,
              dataHubPorts,
              backupPorts,
            };
          }
        }
        
        return {
          selectedController,
          requiredPorts,
          totalPixels,
          isRedundancyMode,
          dataHubPorts,
          backupPorts,
        };
      }
    } else {

      requiredPorts = dataHubPorts;
      backupPorts = 0;

      const selectedController = CONTROLLERS.find(ctrl => ctrl.portCount >= requiredPorts);
      
      if (selectedController) {

        if (totalPixels > selectedController.pixelCapacity * 1000000) {

          const pixelCapableControllers = CONTROLLERS.filter(
            ctrl => ctrl.pixelCapacity * 1000000 >= totalPixels
          );
          
          if (pixelCapableControllers.length > 0) {

            const bestController = pixelCapableControllers.sort((a, b) => {
              if (a.portCount !== b.portCount) {
                return a.portCount - b.portCount; // Prefer fewer ports
              }
              return a.pixelCapacity - b.pixelCapacity; // Then prefer lower pixel capacity
            })[0];
            
            return {
              selectedController: bestController,
              requiredPorts,
              totalPixels,
              isRedundancyMode,
              dataHubPorts,
              backupPorts,
            };
          }
        }
        
        return {
          selectedController,
          requiredPorts,
          totalPixels,
          isRedundancyMode,
          dataHubPorts,
          backupPorts,
        };
      }
    }

    const fallbackController = CONTROLLERS[CONTROLLERS.length - 1];
    return {
      selectedController: fallbackController,
      requiredPorts: fallbackController.portCount,
      totalPixels,
      isRedundancyMode,
      dataHubPorts,
      backupPorts: isRedundancyMode ? dataHubPorts : 0,
    };
  }, [dataHubPorts, totalPixels, isRedundancyMode]);
};

export { CONTROLLERS };