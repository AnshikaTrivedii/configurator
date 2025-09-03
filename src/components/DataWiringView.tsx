import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  BaseEdge,
  getStraightPath,
  EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Product, CabinetGrid } from '../types';
import { useControllerSelection } from '../hooks/useControllersSelection';

type DataHubNodeData = { 
  label: string; 
  additionalInfo?: string; 
  color?: string;
  controllerName?: string;
  isBackup?: boolean;
};

const DataHubNode = ({ data }: { data: DataHubNodeData }) => {
  const color = data.color || '#2563eb';
  // Use color for border and gradient
  const gradient = `linear-gradient(135deg, ${color}22 0%, ${color}33 100%)`;
  return (
    <div
      className="relative rounded-xl shadow-xl p-6 min-w-40 text-center"
      style={{
        background: gradient,
        border: `3px solid ${color}`,
      }}
    >
      <div className="flex justify-center mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: color }}
        >
          <div className="w-4 h-4 bg-white rounded-sm"></div>
        </div>
      </div>
      <div className="text-lg font-bold mb-1" style={{ color }}>{data.label}</div>
      <div
        className="text-sm font-medium bg-white/70 px-3 py-1 rounded-md"
        style={{ color }}
      >
        {data.additionalInfo}
      </div>
      {data.controllerName && (
        <div
          className="text-xs font-semibold bg-white/80 px-2 py-1 rounded mt-2"
          style={{ color: '#374151' }}
        >
          {data.controllerName}
        </div>
      )}
      <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 flex gap-1">
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: color }}></div>
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: color + '99', animationDelay: '0.2s' }}></div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  );
};

type DataCabinetNodeData = { label: string; additionalInfo?: string; color?: string };
const DataCabinetNode = ({ data }: { data: DataCabinetNodeData }) => {
  const color = data.color || '#2563eb';
  const gradient = `linear-gradient(135deg, ${color}11 0%, ${color}22 100%)`;
  return (
    <div
      className="relative rounded-lg shadow-md p-4 min-w-28 text-center"
      style={{
        background: gradient,
        border: `2px solid ${color}`,
      }}
    >
      <div className="text-sm font-bold mb-1" style={{ color }}>{data.label}</div>
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color }}>{'DATA'}</div>
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
      {/* Incoming cables */}
      <Handle type="target" position={Position.Left} id="left-target" style={{ background: color }} />
      <Handle type="target" position={Position.Top} id="top-target" style={{ background: color }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ background: color }} />
      {/* Outgoing cables */}
      <Handle type="source" position={Position.Right} id="right-source" style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: color }} />
      <Handle type="source" position={Position.Left} id="left-source" style={{ background: color }} />
    </div>
  );
};

// Add this custom node type for group backgrounds
type GroupBackgroundNodeData = { width: number; height: number };
const GroupBackgroundNode = ({ data }: { data: GroupBackgroundNodeData }) => (
  <div
    style={{
      width: data.width,
      height: data.height,
      background: 'rgba(248, 110, 56, 0.1)',
      borderRadius: 24,
      border: '2px solid rgba(56, 189, 248, 0.18)',
      position: 'absolute',
      zIndex: 0,
      pointerEvents: 'none',
    }}
  />
);

// Add corridor visualization nodes
type CorridorNodeData = { corridorIndex: number; totalCorridors: number };
const CorridorNode = ({ data }: { data: CorridorNodeData }) => (
  <div
    style={{
      width: '4px',
      height: '600px',
      background: `linear-gradient(180deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.1) 100%)`,
      borderRadius: '2px',
      position: 'absolute',
      zIndex: 1,
      pointerEvents: 'none',
      border: '1px dashed rgba(59, 130, 246, 0.3)',
      opacity: data.totalCorridors > 1 ? 0.8 : 0.6, // Adjust opacity based on corridor count
    }}
  />
);

// --- Custom BendEdge for React Flow ---
const BendEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data }) => {
  // Corridor-based routing (aligns cleanly with the target handle to avoid diagonals)
  if (typeof data?.corridorX === 'number') {
    const corridorX = data.corridorX as number;
    const d = `M ${sourceX},${sourceY} L ${corridorX},${sourceY} L ${corridorX},${targetY} L ${targetX},${targetY}`;
    return <BaseEdge id={id} path={d} style={style} markerEnd={markerEnd} />;
  }

  // Explicit bend points fallback
  const hasBendPoints = Array.isArray(data?.bendPoints) && data.bendPoints.length > 0;
  if (hasBendPoints) {
    let d = `M ${sourceX},${sourceY}`;
    (data!.bendPoints as { x: number; y: number }[]).forEach((pt) => {
      d += ` L ${pt.x},${pt.y}`;
    });
    d += ` L ${targetX},${targetY}`;
    return <BaseEdge id={id} path={d} style={style} markerEnd={markerEnd} />;
  }

  // Default straight path
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />;
};

const nodeTypes = {
  dataHub: DataHubNode,
  dataCabinet: DataCabinetNode,
  groupBackground: GroupBackgroundNode,
  corridor: CorridorNode,
};
const edgeTypes = {
  bend: BendEdge,
};

interface Props {
  product: Product;
  cabinetGrid: CabinetGrid;
  redundancyEnabled: boolean;
  onRedundancyChange: (enabled: boolean) => void;
  controllerSelection?: any;
}

const DataWiringView: React.FC<Props> = ({ product, cabinetGrid, redundancyEnabled, onRedundancyChange, controllerSelection }) => {
  // Calculate pixel count per cabinet
  const pixelPitch = product.pixelPitch; // in mm
  const cabinetWidth = product.cabinetDimensions.width; // in mm
  const cabinetHeight = product.cabinetDimensions.height; // mm
  const pixelCountPerCabinet = Math.round((cabinetWidth / pixelPitch) * (cabinetHeight / pixelPitch));
  const PIXEL_LIMIT = 655000;

  // Color palette for Data Hub groups
  // Generate a unique color for each Data Hub
  function getHubColor(index: number, total: number) {
    const hue = (index * 360) / total;
    return `hsl(${hue}, 70%, 50%)`;
  }
  function getBackupHubColor(index: number, total: number) {
    const hue = (index * 360) / total;
    return `hsl(${hue}, 50%, 35%)`;
  }
  // const neutralCabinetColor = '#2563eb';

  // Generate a unique color for each cabinet
  // function getCabinetColor(index: number, total: number) {
  //   const hue = (index * 360) / total;
  //   return `hsl(${hue}, 70%, 60%)`;
  // }

  // const [redundancyEnabled, setRedundancyEnabled] = useState(false);

  // Calculate total pixels and data hub ports for controller selection
  const totalPixels = pixelCountPerCabinet * cabinetGrid.columns * cabinetGrid.rows;
  
  // Calculate number of data hub ports needed based on pixel limit
  const dataHubPorts = Math.ceil(totalPixels / PIXEL_LIMIT);
  
  // Use provided controller selection or fall back to hook
  const internalControllerSelection = controllerSelection || useControllerSelection(dataHubPorts, totalPixels, redundancyEnabled);

  const generateNodesAndEdges = useMemo(() => {
    const cols = cabinetGrid.columns;
    const rows = cabinetGrid.rows;
    const totalCabinets = cols * rows;

    type FlowNode = {
      id: string;
      type: string;
      position: { x: number; y: number };
      data: DataHubNodeData | DataCabinetNodeData | GroupBackgroundNodeData | CorridorNodeData;
      draggable?: boolean;
      selectable?: boolean;
      zIndex?: number;
    };
    type BendData = { bendPoints?: { x: number; y: number }[]; corridorX?: number };
    type FlowEdge = {
      id: string;
      source: string;
      target: string;
      type: string;
      animated: boolean;
      style: React.CSSProperties;
      markerEnd: { type: MarkerType; color: string };
      sourceHandle?: string;
      targetHandle?: string;
      data?: BendData;
    };

    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const cabinetAssignments: { [cabinetId: string]: number } = {};

    // Data Hub stacking
    const dataHubStartX = 50;
    const dataHubStartY = 50;
    const dataHubSpacingY = 220;

    // Cabinet node layout
    const startX = 350;
    const startY = 150;
    const spacingX = 140;
    const spacingY = 120;

    // Compute the right side of the cabinet grid, then place backup hubs to the right with a clear offset
    const gridRightX = startX + (cols - 1) * spacingX;
    const backupHubRightOffset = 320; // px offset from the grid's right edge
    const backupHubX = gridRightX + backupHubRightOffset;
    
    // const rightCorridorX = gridRightX + 40; // corridor for routing dashed backup edges

    // Assign cabinets to hubs (serpentine order)
    let nodeId = 1;
    let cumulativePixels = 0;
    let currentHubIndex = 0;
    // let nextHubThreshold = PIXEL_LIMIT;
    const hubFirstCabinet: number[] = [1]; // The first cabinet for each hub

    for (let row = 0; row < rows; row++) {
      const isEven = row % 2 === 0;
      const rowStart = isEven ? 0 : cols - 1;
      const rowEnd = isEven ? cols : -1;
      const step = isEven ? 1 : -1;
      for (let col = rowStart; col !== rowEnd; col += step) {
        // Strictly enforce the pixel limit: if adding this cabinet would exceed the limit, start a new hub first
        if (cumulativePixels + pixelCountPerCabinet > PIXEL_LIMIT) {
          currentHubIndex++;
          cumulativePixels = 0;
          hubFirstCabinet.push(nodeId);
        }
        cabinetAssignments[`cabinet-${nodeId}`] = currentHubIndex;
        // Debug log for hub assignment
        if (nodeId >= 7 && nodeId <= 18) {
          console.log(`Cabinet ${nodeId} assigned to hub ${currentHubIndex}`);
        }
        cumulativePixels += pixelCountPerCabinet;
        nodeId++;
      }
    }

    // --- Rebalance adjacent hubs to keep cabinet counts roughly equal while respecting pixel limit ---
    const totalHubs = currentHubIndex + 1;
    
    // Create multiple corridors for backup hub routing to avoid cabinet overlap
    const maxCorridors = Math.min(totalHubs, 4); // Limit to 4 corridors max
    const corridorSpacing = maxCorridors > 1 ? 120 : 80; // Increase spacing when multiple corridors
    const corridors: number[] = [];
    for (let i = 0; i < maxCorridors; i++) {
      corridors.push(gridRightX + 40 + (i * corridorSpacing));
    }
    
    if (totalHubs > 1) {
      const maxCabsPerHub = Math.max(1, Math.floor(PIXEL_LIMIT / pixelCountPerCabinet));
      // Helper to get start and end indices (1-based) for a hub's contiguous block
      const getHubRange = (hubIdx: number) => {
        const start = hubFirstCabinet[hubIdx];
        const end = hubIdx + 1 < hubFirstCabinet.length ? hubFirstCabinet[hubIdx + 1] - 1 : totalCabinets;
        return { start, end };
      };
      // Iterate over adjacent hub pairs and shift the boundary leftwards if needed
      for (let i = 0; i < totalHubs - 1; i++) {
        const leftRange = getHubRange(i);
        const rightRange = getHubRange(i + 1);
        let leftCount = leftRange.end - leftRange.start + 1;
        let rightCount = rightRange.end - rightRange.start + 1;
        const desiredRight = Math.min(maxCabsPerHub, Math.ceil((leftCount + rightCount) / 2));
        if (rightCount < desiredRight && leftCount > 1) {
          const shift = Math.min(desiredRight - rightCount, leftCount - 1);
          // New start for right hub by taking from the end of left hub
          const oldRightStart = hubFirstCabinet[i + 1];
          const newRightStart = Math.max(leftRange.start + 1, oldRightStart - shift);
          if (newRightStart < oldRightStart) {
            // Reassign cabinets from [newRightStart .. oldRightStart-1] to right hub
            for (let cab = newRightStart; cab < oldRightStart; cab++) {
              cabinetAssignments[`cabinet-${cab}`] = i + 1;
            }
            hubFirstCabinet[i + 1] = newRightStart;
            // Update counts for potential subsequent balancing
            leftCount -= (oldRightStart - newRightStart);
            rightCount += (oldRightStart - newRightStart);
          }
        }
      }
    }

    // Add Data Hub nodes (vertical stacking)
    for (let i = 0; i < totalHubs; i++) {
      const color = getHubColor(i, totalHubs);
      nodes.push({
        id: `data-hub-${i + 1}`,
        type: 'dataHub',
        position: { x: dataHubStartX, y: dataHubStartY + i * dataHubSpacingY },
        data: { label: `Data Hub ${i + 1}`, additionalInfo: 'Single cable', color, controllerName: internalControllerSelection.selectedController.name, isBackup: false },
      });
    }

    // Backup hubs (mirrored) when redundancy is enabled
    if (redundancyEnabled) {
      for (let i = 0; i < totalHubs; i++) {
        const color = getBackupHubColor(i, totalHubs);
        nodes.push({
          id: `backup-hub-${i + 1}`,
          type: 'dataHub',
          position: { x: backupHubX, y: dataHubStartY + i * dataHubSpacingY },
          data: { label: `Backup Hub ${i + 1}`, additionalInfo: 'Redundant', color, controllerName: internalControllerSelection.selectedController.name, isBackup: true },
        });
      }
    }

    // Add cabinet nodes (serpentine placement)
    nodeId = 1;
    for (let row = 0; row < rows; row++) {
      const isEven = row % 2 === 0;
      for (let col = 0; col < cols; col++) {
        const actualCol = isEven ? col : cols - 1 - col;
        const posX = startX + actualCol * spacingX;
        const posY = startY + row * spacingY;
        // Assign the color of the respective Data Hub to each cabinet
        const hubIdx = cabinetAssignments[`cabinet-${nodeId}`];
        const color = getHubColor(hubIdx, totalHubs);
        nodes.push({
          id: `cabinet-${nodeId}`,
          type: 'dataCabinet',
          position: { x: posX, y: posY },
          data: { label: `Cabinet ${nodeId}`, additionalInfo: "", color },
        });
        nodeId++;
      }
    }

    // Group cabinets by Data Hub and add group background nodes
    const groupBackgroundNodes: FlowNode[] = [];
    const corridorNodes: FlowNode[] = [];
    const groups: { [hubIdx: number]: { x: number[]; y: number[] } } = {};
    let tempNodeId = 1;
    for (let row = 0; row < rows; row++) {
      const isEven = row % 2 === 0;
      for (let col = 0; col < cols; col++) {
        const actualCol = isEven ? col : cols - 1 - col;
        const posX = startX + actualCol * spacingX;
        const posY = startY + row * spacingY;
        const hubIdx = cabinetAssignments[`cabinet-${tempNodeId}`];
        if (hubIdx !== undefined) {
          if (!groups[hubIdx]) groups[hubIdx] = { x: [], y: [] };
          groups[hubIdx].x.push(posX);
          groups[hubIdx].y.push(posY);
        }
        tempNodeId++;
      }
    }
    Object.entries(groups).forEach(([hubIdx, coords]) => {
      if (!coords.x.length || !coords.y.length) return;
      const minX = Math.min(...coords.x) - 30;
      const maxX = Math.max(...coords.x) + 170;
      const minY = Math.min(...coords.y) - 20;
      const maxY = Math.max(...coords.y) + 100;
      // Optionally, you could color the background with the hub color as well
      groupBackgroundNodes.push({
        id: `group-bg-${hubIdx}`,
        type: 'groupBackground',
        position: { x: minX, y: minY },
        data: { width: maxX - minX, height: maxY - minY },
        draggable: false,
        selectable: false,
        zIndex: 0,
      });
    });

    // Add corridor visualization nodes
    corridors.forEach((corridorX, index) => {
      corridorNodes.push({
        id: `corridor-${index}`,
        type: 'corridor',
        position: { x: corridorX - 2, y: 0 }, // Center the corridor line
        data: { corridorIndex: index, totalCorridors: corridors.length },
        draggable: false,
        selectable: false,
        zIndex: 1,
      });
    });

    // Edges (serpentine wiring, no cross-hub connections)
    if (totalCabinets > 0) {
      // Connect each Data Hub to the first cabinet in its range with a single step edge, using group color
      for (let i = 0; i < hubFirstCabinet.length; i++) {
        const hubId = `data-hub-${i + 1}`;
        const cabId = `cabinet-${hubFirstCabinet[i]}`;
        const color = getHubColor(i, totalHubs);
        if (i === 0) {
          // Data Hub 1: direct connection (as is)
          edges.push({
            id: `hub${i + 1}-to-cab${hubFirstCabinet[i]}`,
            source: hubId,
            target: cabId,
            type: 'step',
            animated: true,
            style: { stroke: color, strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
          });
        } else {
          // Data Hub 2+: route between rows using bend points
          const cabNode = nodes.find(n => n.id === cabId);
          const hubNode = nodes.find(n => n.id === hubId);
          if (cabNode && hubNode) {
            // Find the row of the first cabinet in this hub
            const cabIdx = parseInt(cabId.split('-')[1], 10) - 1;
            const cabRow = Math.floor(cabIdx / cols);
            // Y position between previous row and this row
            const betweenRowsY = cabRow > 0
              ? (startY + (cabRow - 1) * spacingY + startY + cabRow * spacingY) / 2
              : cabNode.position.y - spacingY / 2;
            const bendX = hubNode.position.x + 100;
            edges.push({
              id: `hub${i + 1}-to-cab${hubFirstCabinet[i]}`,
              source: hubId,
              target: cabId,
              type: 'bend',
              animated: true,
              style: { stroke: color, strokeWidth: 3 },
              markerEnd: { type: MarkerType.ArrowClosed, color },
              data: {
                bendPoints: [
                  { x: bendX, y: hubNode.position.y }, // horizontal from hub
                  { x: bendX, y: betweenRowsY },       // down to between rows
                  { x: cabNode.position.x, y: betweenRowsY }, // horizontal to cabinet column
                ],
              },
            });
          }
        }
      }

      for (let i = 1; i < totalCabinets; i++) {
        const thisCabHub = cabinetAssignments[`cabinet-${i}`];
        const nextCabHub = cabinetAssignments[`cabinet-${i + 1}`];
        const color = getHubColor(thisCabHub, totalHubs);
      
        // Avoid wiring across hubs
        if (thisCabHub !== nextCabHub) continue;
      
        const sourceRow = Math.floor((i - 1) / cols);
        const nextRow = Math.floor(i / cols);
        const isSourceRowEven = sourceRow % 2 === 0;
      
        // Correct vertical connection: end of row (i % cols === 0)
        const isVerticalConnection = i % cols === 0 && nextRow === sourceRow + 1;
      
        if (isVerticalConnection) {
          edges.push({
            id: `data-${i}-to-${i + 1}-vertical`,
            source: `cabinet-${i}`,
            target: `cabinet-${i + 1}`,
            type: 'straight',
            animated: true,
            sourceHandle: 'bottom',
            targetHandle: 'top-target',
            style: { stroke: color, strokeWidth: 2, zIndex: 0 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
          });
          continue;
        }
      
        // Horizontal connection (step type)
        const sourceHandle = isSourceRowEven ? 'right-source' : 'left-source';
        const targetHandle = isSourceRowEven ? 'left-target' : 'right-target';
      
        edges.push({
          id: `data-${i}-to-${i + 1}`,
          source: `cabinet-${i}`,
          target: `cabinet-${i + 1}`,
          type: 'step',
          animated: true,
          sourceHandle,
          targetHandle,
          style: { stroke: color, strokeWidth: 2, zIndex: 0 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        });
      }      

      // Redundancy mirrored edges when enabled
      if (redundancyEnabled) {
        // Backup hub connection to LAST cabinet in each hub's range
        for (let i = 0; i < hubFirstCabinet.length; i++) {
          const backupId = `backup-hub-${i + 1}`;
          const lastCabinetIdx = i + 1 < hubFirstCabinet.length ? hubFirstCabinet[i + 1] - 1 : totalCabinets;
          const lastCabId = `cabinet-${lastCabinetIdx}`;
          const color = getBackupHubColor(i, totalHubs);

          const cabNode = nodes.find(n => n.id === lastCabId);
          const hubNode = nodes.find(n => n.id === backupId);
          if (cabNode && hubNode) {
            // Use corridor-based routing with multiple levels to avoid cabinet overlap
            const corridorIndex = Math.min(i, corridors.length - 1);
            const corridorX = corridors[corridorIndex];
            
            // Calculate optimal connection point on the cabinet
            const cabIdx = parseInt(lastCabId.split('-')[1], 10) - 1;
            const cabRow = Math.floor(cabIdx / cols);
            const cabCol = cabIdx % cols;
            
            // Determine if this is a right-edge cabinet (last column)
            const isRightEdge = cabCol === cols - 1;
            
            // Route through corridor with smart connection points
            if (isRightEdge) {
              // Right-edge cabinet: connect directly to right side through corridor
              edges.push({
                id: `backup-hub${i + 1}-to-cab${lastCabinetIdx}`,
                source: backupId,
                target: lastCabId,
                type: 'bend',
                animated: true,
                style: { stroke: color, strokeWidth: 3, strokeDasharray: '6 6' },
                markerEnd: { type: MarkerType.ArrowClosed, color },
                data: { corridorX: corridorX },
              });
            } else {
              // Interior cabinet: route through corridor and connect from above/below
              // Calculate optimal connection point to avoid cabinet overlap
              const cabinetCenterY = cabNode.position.y + 60; // Cabinet height is ~120px
              const connectionY = cabRow % 2 === 0 
                ? Math.max(cabinetCenterY - 80, startY - 20) // Above cabinet, but not too high
                : Math.min(cabinetCenterY + 80, startY + rows * spacingY + 20); // Below cabinet, but not too low
              
              edges.push({
                id: `backup-hub${i + 1}-to-cab${lastCabinetIdx}`,
                source: backupId,
                target: lastCabId,
                type: 'bend',
                animated: true,
                style: { stroke: color, strokeWidth: 3, strokeDasharray: '6 6' },
                markerEnd: { type: MarkerType.ArrowClosed, color },
                data: {
                  bendPoints: [
                    { x: hubNode.position.x - 20, y: hubNode.position.y }, // left from hub
                    { x: corridorX, y: hubNode.position.y }, // horizontal to corridor
                    { x: corridorX, y: connectionY }, // vertical in corridor
                    { x: cabNode.position.x + 70, y: connectionY }, // horizontal to cabinet
                  ],
                },
              });
            }
          }
        }

        // Reversed cabinet-to-cabinet connections within each hub range (mirror serpentine logic)
        for (let i = 1; i < totalCabinets; i++) {
          const thisCabHub = cabinetAssignments[`cabinet-${i}`];
          const nextCabHub = cabinetAssignments[`cabinet-${i + 1}`];
          if (thisCabHub !== nextCabHub) continue;
          const color = getBackupHubColor(thisCabHub, totalHubs);

          // For reverse direction, the source is cabinet-(i+1) and the target is cabinet-i
          const sourceRow = Math.floor(i / cols);           // row of cabinet-(i+1)
          const targetRow = Math.floor((i - 1) / cols);     // row of cabinet-i
          const isVerticalConnection = i % cols === 0 && sourceRow === targetRow + 1;

          if (isVerticalConnection) {
            edges.push({
              id: `backup-data-${i + 1}-to-${i}-vertical`,
              source: `cabinet-${i + 1}`,
              target: `cabinet-${i}`,
              type: 'straight',
              animated: true,
              sourceHandle: 'bottom',
              targetHandle: 'top-target',
              style: { stroke: color, strokeWidth: 2, zIndex: 0, strokeDasharray: '6 6' },
              markerEnd: { type: MarkerType.ArrowClosed, color },
            });
            continue;
          }

          const isSourceRowEven = sourceRow % 2 === 0;
          const sourceHandle = isSourceRowEven ? 'left-source' : 'right-source';    // reverse direction
          const targetHandle = isSourceRowEven ? 'right-target' : 'left-target';
          edges.push({
            id: `backup-data-${i + 1}-to-${i}`,
            source: `cabinet-${i + 1}`,
            target: `cabinet-${i}`,
            type: 'step',
            animated: true,
            sourceHandle,
            targetHandle,
            style: { stroke: color, strokeWidth: 2, zIndex: 0, strokeDasharray: '6 6' },
            markerEnd: { type: MarkerType.ArrowClosed, color },
          });
        }
      }
    }
    return { nodes, edges, groupBackgroundNodes, corridorNodes };
  }, [cabinetGrid, pixelCountPerCabinet, redundancyEnabled, internalControllerSelection]);

  const [nodes, setNodes, onNodesChange] = useNodesState(generateNodesAndEdges.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generateNodesAndEdges.edges);
  const groupBackgroundNodes = generateNodesAndEdges.groupBackgroundNodes;
  const corridorNodes = generateNodesAndEdges.corridorNodes;
  const allNodes = [...groupBackgroundNodes, ...corridorNodes, ...nodes];

  useEffect(() => {
    setNodes(generateNodesAndEdges.nodes);
    setEdges(generateNodesAndEdges.edges);
  }, [generateNodesAndEdges, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative', background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', boxShadow: '0 1px 3px #0001' }}>
          <input type="checkbox" checked={redundancyEnabled} onChange={(e) => onRedundancyChange(e.target.checked)} />
          <span style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>Redundancy</span>
        </label>
        

      </div>
      
      {/* Controller Information Panel */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', boxShadow: '0 1px 3px #0001', minWidth: '280px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
          Controller Selection
        </div>
        <div style={{ fontSize: 12, color: '#374151', lineHeight: '1.4' }}>
          <div style={{ marginBottom: '4px' }}>
            <strong>Selected:</strong> {internalControllerSelection.selectedController.name}
          </div>

          <div style={{ marginBottom: '4px' }}>
            <strong>Ports:</strong> {internalControllerSelection.requiredPorts} / {internalControllerSelection.selectedController.portCount}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Data Hub Ports:</strong> {internalControllerSelection.dataHubPorts}
          </div>
          {internalControllerSelection.isRedundancyMode && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Backup Ports:</strong> {internalControllerSelection.backupPorts}
            </div>
          )}
          <div style={{ marginBottom: '4px' }}>
            <strong>Pixel Capacity:</strong> {internalControllerSelection.selectedController.pixelCapacity.toFixed(1)}M
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Total Pixels:</strong> {(internalControllerSelection.totalPixels / 1000000).toFixed(1)}M
          </div>
          <div style={{ 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '11px', 
            fontWeight: '500',
            background: internalControllerSelection.totalPixels <= internalControllerSelection.selectedController.pixelCapacity * 1000000 ? '#dcfce7' : '#fef3c7',
            color: internalControllerSelection.totalPixels <= internalControllerSelection.selectedController.pixelCapacity * 1000000 ? '#166534' : '#92400e'
          }}>
            {internalControllerSelection.totalPixels <= internalControllerSelection.selectedController.pixelCapacity * 1000000 
              ? '✓ Within Capacity' 
              : '⚠ Exceeds Capacity'}
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={allNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-transparent"
        fitViewOptions={{ padding: 0.1 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Controls position="bottom-right" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200" />
        <Background color="#e2e8f0" gap={30} size={1} className="opacity-30" />
      </ReactFlow>
    </div>
  );
};

export default DataWiringView; 