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
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Product, CabinetGrid } from '../types';

const DataHubNode = ({ data }: any) => {
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
      <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 flex gap-1">
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: color }}></div>
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: color + '99', animationDelay: '0.2s' }}></div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  );
};

const DataCabinetNode = ({ data }: any) => {
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
const GroupBackgroundNode = ({ data }: any) => (
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

// --- Custom BendEdge for React Flow ---
const BendEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data }) => {
  // Type guard for bendPoints
  const hasBendPoints = Array.isArray(data?.bendPoints) && data.bendPoints.length > 0;
  if (!hasBendPoints) {
    const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    return (
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
    );
  }
  // Build path with bends
  let d = `M ${sourceX},${sourceY}`;
  (data.bendPoints as { x: number; y: number }[]).forEach((pt) => {
    d += ` L ${pt.x},${pt.y}`;
  });
  d += ` L ${targetX},${targetY}`;
  return (
    <>
      <BaseEdge id={id} path={d} style={style} markerEnd={markerEnd} />
    </>
  );
};

const nodeTypes = {
  dataHub: DataHubNode,
  dataCabinet: DataCabinetNode,
  groupBackground: GroupBackgroundNode,
};
const edgeTypes = {
  bend: BendEdge,
};

interface Props {
  product: Product;
  cabinetGrid: CabinetGrid;
}

const DataWiringView: React.FC<Props> = ({ product, cabinetGrid }) => {
  // Calculate pixel count per cabinet
  const pixelPitch = product.pixelPitch; // in mm
  const cabinetWidth = product.cabinetDimensions.width; // in mm
  const cabinetHeight = product.cabinetDimensions.height; // in mm
  const pixelCountPerCabinet = Math.round((cabinetWidth / pixelPitch) * (cabinetHeight / pixelPitch));
  const PIXEL_LIMIT = 655000;

  // Color palette for Data Hub groups
  // Generate a unique color for each Data Hub
  function getHubColor(index: number, total: number) {
    const hue = (index * 360) / total;
    return `hsl(${hue}, 70%, 50%)`;
  }
  const neutralCabinetColor = '#2563eb';

  // Generate a unique color for each cabinet
  function getCabinetColor(index: number, total: number) {
    const hue = (index * 360) / total;
    return `hsl(${hue}, 70%, 60%)`;
  }

  // Make cabinetAssignments available for group backgrounds
  const cabinetAssignments: { [cabinetId: string]: number } = {};
  const generateNodesAndEdges = useMemo(() => {
    const cols = cabinetGrid.columns;
    const rows = cabinetGrid.rows;
    const totalCabinets = cols * rows;

    const nodes: any[] = [];
    const edges: any[] = [];

    // Data Hub stacking
    const dataHubStartX = 50;
    const dataHubStartY = 50;
    const dataHubSpacingY = 220;
    const dataHubs: { id: string; position: { x: number; y: number }; label: string }[] = [];

    // Cabinet node layout
    const startX = 350;
    const startY = 150;
    const spacingX = 140;
    const spacingY = 120;

    // Assign cabinets to hubs (serpentine order)
    let nodeId = 1;
    let cumulativePixels = 0;
    let currentHubIndex = 0;
    let nextHubThreshold = PIXEL_LIMIT;
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
        cumulativePixels += pixelCountPerCabinet;
        nodeId++;
      }
    }

    // Add Data Hub nodes (vertical stacking)
    const totalHubs = currentHubIndex + 1;
    for (let i = 0; i < totalHubs; i++) {
      const color = getHubColor(i, totalHubs);
      nodes.push({
        id: `data-hub-${i + 1}`,
        type: 'dataHub',
        position: { x: dataHubStartX, y: dataHubStartY + i * dataHubSpacingY },
        data: { label: `Data Hub ${i + 1}`, additionalInfo: 'Single cable', color },
      });
    }

    // Add cabinet nodes (serpentine placement)
    nodeId = 1;
    for (let row = 0; row < rows; row++) {
      const isEven = row % 2 === 0;
      const rowStart = isEven ? 0 : cols - 1;
      const rowEnd = isEven ? cols : -1;
      const step = isEven ? 1 : -1;
      for (let col = rowStart; col !== rowEnd; col += step) {
        const posX = startX + col * spacingX;
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
    const groupBackgroundNodes: any[] = [];
    const groups: { [hubIdx: number]: { x: number[]; y: number[] } } = {};
    let tempNodeId = 1;
    for (let row = 0; row < rows; row++) {
      const isEven = row % 2 === 0;
      const rowStart = isEven ? 0 : cols - 1;
      const rowEnd = isEven ? cols : -1;
      const step = isEven ? 1 : -1;
      for (let col = rowStart; col !== rowEnd; col += step) {
        const posX = startX + col * spacingX;
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

      // Serpentine wiring between cabinets, no cross-hub connections
      for (let i = 1; i < totalCabinets; i++) {
        const thisCabHub = cabinetAssignments[`cabinet-${i}`];
        const nextCabHub = cabinetAssignments[`cabinet-${i + 1}`];
        const color = getHubColor(thisCabHub, totalHubs);
        if (thisCabHub !== nextCabHub) {
          // Do not connect across hubs
          continue;
        }
        const thisCol = (i - 1) % cols;
        const thisRow = Math.floor((i - 1) / cols);
        const nextCol = i % cols;
        const nextRow = Math.floor(i / cols);
        // If next cabinet is directly below (same column, next row)
        if (thisCol === nextCol && nextRow === thisRow + 1) {
          edges.push({
            id: `data-${i}-to-${i + 1}-vertical`,
            source: `cabinet-${i}`,
            target: `cabinet-${i + 1}`,
            type: 'smoothstep',
            animated: true,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            style: { stroke: color, strokeWidth: 2, zIndex: 0 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
          });
          continue;
        }
        // Horizontal connection
        const sourceRow = Math.floor((i - 1) / cols);
        const isSourceRowEven = sourceRow % 2 === 0;
        if ((isSourceRowEven && i % cols === 0) || (!isSourceRowEven && i % cols === 1)) {
          // Vertical connection at row end
          // Use side handles for vertical connections to avoid overlapping cabinet boxes
          const verticalSourceHandle = isSourceRowEven ? 'right-source' : 'left-source';
          const verticalTargetHandle = isSourceRowEven ? 'right-target' : 'left-target';
          edges.push({
            id: `data-${i}-to-${i + 1}`,
            source: `cabinet-${i}`,
            target: `cabinet-${i + 1}`,
            type: 'smoothstep', // Use smoothstep for vertical wiring
            animated: true,
            sourceHandle: verticalSourceHandle,
            targetHandle: verticalTargetHandle,
            style: { stroke: color, strokeWidth: 2, zIndex: 0 }, // Ensure edge is behind nodes
            markerEnd: { type: MarkerType.ArrowClosed, color },
          });
          continue;
        }
        // Horizontal connection
        const sourceHandle = isSourceRowEven ? 'right-source' : 'left-source';
        const targetHandle = isSourceRowEven ? 'left-target' : 'right-target';
        edges.push({
          id: `data-${i}-to-${i + 1}`,
          source: `cabinet-${i}`,
          target: `cabinet-${i + 1}`,
          type: 'step',
          animated: true,
          sourceHandle: sourceHandle,
          targetHandle: targetHandle,
          style: { stroke: color, strokeWidth: 2, zIndex: 0 }, // Ensure edge is behind nodes
          markerEnd: { type: MarkerType.ArrowClosed, color },
        });
      }
    }

    return { nodes, edges, groupBackgroundNodes };
  }, [cabinetGrid, product]);

  const [nodes, setNodes, onNodesChange] = useNodesState(generateNodesAndEdges.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generateNodesAndEdges.edges);
  const groupBackgroundNodes = generateNodesAndEdges.groupBackgroundNodes;
  const allNodes = [...groupBackgroundNodes, ...nodes];

  useEffect(() => {
    setNodes(generateNodesAndEdges.nodes);
    setEdges(generateNodesAndEdges.edges);
  }, [generateNodesAndEdges, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative', background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' }}>
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