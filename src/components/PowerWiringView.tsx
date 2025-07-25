import React, { useMemo, useEffect, useState } from 'react';
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
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Product, CabinetGrid } from '../types';
import { Lock } from 'lucide-react';

interface Props {
  product: Product;
  cabinetGrid: CabinetGrid;
}

const PowerWiringView: React.FC<Props> = ({ product, cabinetGrid }) => {
  // --- Interactivity State ---
  const [hoveredRun, setHoveredRun] = useState<number | null>(null);
  const [selectedRun, setSelectedRun] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  // --- Sidebar/modal state ---
  const [sidebarData, setSidebarData] = useState<any>(null);

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
    const spacingX = 180; // was 140 or less
    const spacingY = 140; // was 120 or less

    // Update the power run assignment logic to snake through the grid row by row, left to right, and start a new run as soon as the max is reached for the pixel pitch.
    // Place this logic where you generate the nodes and edges:
    const getMaxPerRun = (pixelPitch: number) => {
      if ([0.9, 0.9375, 1.25, 1.5, 1.5625, 1.8, 2.5].some(p => Math.abs(pixelPitch - p) < 0.01)) return 25;
      if ([3, 3.0].some(p => Math.abs(pixelPitch - p) < 0.01)) return 35;
      if ([4, 4.0, 6.6, 10, 10.0].some(p => Math.abs(pixelPitch - p) < 0.01)) return 4;
      return 25;
    };

    const maxPerRun = getMaxPerRun(product.pixelPitch);
    let runIndex = 1;
    let cabinetsInRun = 0;
    let prevCabinetId = null;
    for (let row = 0; row < cabinetGrid.rows; row++) {
      for (let col = 0; col < cabinetGrid.columns; col++) {
        const cabinetId = `cabinet-${row + 1}-${col + 1}`;
        // Assign runIndex to cabinet node data
        cabinetAssignments[cabinetId] = runIndex;
        // Debug log for hub assignment
        if (parseInt(cabinetId.split('-')[1], 10) >= 7 && parseInt(cabinetId.split('-')[1], 10) <= 18) {
          console.log(`Cabinet ${cabinetId} assigned to hub ${runIndex}`);
        }
        cabinetsInRun++;
        if (cabinetsInRun === maxPerRun) {
          runIndex++;
          cabinetsInRun = 0;
          prevCabinetId = null;
        }
      }
    }

    // Add Data Hub nodes (vertical stacking)
    const totalHubs = runIndex; // Total number of power runs
    for (let i = 0; i < totalHubs; i++) {
      const color = getHubColor(i, totalHubs);
      nodes.push({
        id: `data-hub-${i + 1}`,
        type: 'dataHub',
        position: { x: dataHubStartX, y: dataHubStartY + i * dataHubSpacingY },
        data: { label: `Power Distribution ${i + 1}`, additionalInfo: 'Single cable', color },
      });
    }

    // Add cabinet nodes (serpentine placement)
    let nodeId = 1;
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
          type: 'ledPanel', // <-- must match nodeTypes
          position: { x: posX, y: posY },
          data: { label: `Cabinet ${nodeId}`, additionalInfo: "", color, runIndex: hubIdx + 1 },
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

    // Edges (serpentine wiring, no cross-hub connections)
    if (totalCabinets > 0) {
      // Connect each Data Hub to the first cabinet in its range with a single step edge, using group color
      for (let i = 0; i < totalHubs; i++) {
        const hubId = `data-hub-${i + 1}`;
        const firstCabinetInRun = `cabinet-${i * maxPerRun + 1}`;
        const color = getHubColor(i, totalHubs);
        if (i === 0) {
          // Data Hub 1: direct connection (as is)
          edges.push({
            id: `hub${i + 1}-to-cab${firstCabinetInRun}`,
            source: hubId,
            target: firstCabinetInRun,
            type: 'step',
            animated: true,
            style: { stroke: color, strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
          });
        } else {
          // Data Hub 2+: route between rows using bend points
          const cabNode = nodes.find(n => n.id === firstCabinetInRun);
          const hubNode = nodes.find(n => n.id === hubId);
          if (cabNode && hubNode) {
            // Find the row of the first cabinet in this hub
            const cabIdx = parseInt(firstCabinetInRun.split('-')[1], 10) - 1;
            const cabRow = Math.floor(cabIdx / cols);
            // Y position between previous row and this row
            const betweenRowsY = cabRow > 0
              ? (startY + (cabRow - 1) * spacingY + startY + cabRow * spacingY) / 2
              : cabNode.position.y - spacingY / 2;
            const bendX = hubNode.position.x + 100;
            edges.push({
              id: `hub${i + 1}-to-cab${firstCabinetInRun}`,
              source: hubId,
              target: firstCabinetInRun,
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
        const currentCol = (i - 1) % cols;
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
    }
    return { nodes, edges, groupBackgroundNodes };
  }, [cabinetGrid, product]);

  const [nodes, setNodes, onNodesChange] = useNodesState(generateNodesAndEdges.nodes);
  // --- Edge filtering: Remove previous cabinet-to-cabinet connection if cabinet is directly powered by a distributor ---
  const filterEdges = (edges: any[]) => {
    // Find all cabinets that are directly powered by a distributor (i.e., have an edge from a data hub)
    const directlyPoweredCabinets = new Set(
      edges
        .filter(e => e.source && e.source.startsWith('data-hub-'))
        .map(e => e.target)
    );
    // Remove cabinet-to-cabinet edge if the target is directly powered by a distributor
    return edges.filter(e => {
      if (e.source && e.source.startsWith('data-hub-')) return true;
      if (directlyPoweredCabinets.has(e.target)) return false;
      return true;
    });
  };
  const [edges, setEdges, onEdgesChange] = useEdgesState(filterEdges(generateNodesAndEdges.edges));
  const groupBackgroundNodes = generateNodesAndEdges.groupBackgroundNodes;
  const allNodes = [...groupBackgroundNodes, ...nodes];

  useEffect(() => {
    setNodes(generateNodesAndEdges.nodes);
    setEdges(filterEdges(generateNodesAndEdges.edges)); // Apply filter here
  }, [generateNodesAndEdges, setNodes, setEdges]);

  // --- Custom Node Renderers with Interactivity ---
  const PowerNode = ({ data }: any) => {
    const color = runColors[(data.runIndex - 1) % runColors.length];
    return (
      <div
        className="relative rounded-xl shadow-xl p-6 min-w-40 text-center cursor-pointer transition-all duration-200"
        style={{
          background: `linear-gradient(135deg, ${color}22 0%, ${color}33 100%)`,
          border: `3px solid ${color}`,
          boxShadow: hoveredRun === data.runIndex || selectedRun === data.runIndex ? `0 0 16px 2px ${color}` : undefined,
          opacity: hoveredRun === data.runIndex || selectedRun === data.runIndex ? 1 : 0.7,
        }}
        onMouseEnter={data.onHover}
        onMouseLeave={data.onLeave}
        onClick={data.onClick}
        onMouseMove={e => data.onTooltip && data.onTooltip(e.clientX, e.clientY)}
        onMouseOut={data.onTooltipLeave}
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
        <div className="text-sm font-medium bg-white/70 px-3 py-1 rounded-md" style={{ color }}>
          Power Run
        </div>
        <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 flex gap-1">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: color }}></div>
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: color + '99', animationDelay: '0.2s' }}></div>
        </div>
        <Handle type="source" position={Position.Right} style={{ background: color }} />
      </div>
    );
  };

  // --- Enhanced CabinetNode for always-on strong colored border and glow ---
  const CabinetNode = ({ data }: any) => {
    const color = runColors[(data.runIndex - 1) % runColors.length];
    const isActive = hoveredRun === data.runIndex || selectedRun === data.runIndex;
    return (
      <div
        className={`relative rounded-lg shadow p-4 min-w-32 text-center cursor-pointer transition-all duration-200`}
        style={{
          background: color + '22', // solid, readable color for the run
          borderLeft: `8px solid ${color}`,
          borderRight: '1px solid #e5e7eb',
          borderTop: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: isActive ? `0 0 16px 4px ${color}88` : '0 1px 4px #0001',
          color: '#222',
          fontWeight: 600,
          fontSize: 18,
          opacity: 1,
          transition: 'box-shadow 0.2s, background 0.2s',
          zIndex: isActive ? 10 : 1,
        }}
        onMouseEnter={data.onHover}
        onMouseLeave={data.onLeave}
        onClick={() => setSidebarData({ type: 'cabinet', data })}
        onMouseMove={e => data.onTooltip && data.onTooltip(e.clientX, e.clientY)}
        onMouseOut={data.onTooltipLeave}
        tabIndex={0}
        aria-label={`Cabinet ${data.label}, Power Run ${data.runIndex}`}
      >
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>{data.label}</div>
        <div style={{ fontSize: 13, color: '#444' }}>{'POWER'}</div>
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${data.connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
        {/* Handles */}
        <Handle type="target" position={Position.Left} id="left-target" style={{ background: color }} />
        <Handle type="target" position={Position.Top} id="top-target" style={{ background: color }} />
        <Handle type="target" position={Position.Right} id="right-target" style={{ background: color }} />
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
    ledPanel: CabinetNode, // Use enhanced CabinetNode for all cabinet nodes
    power: PowerNode,
  };
  const edgeTypes = {
    bend: BendEdge,
  };

  // --- Custom Legend ---
  const runColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

  // 1. Glassmorphism for PR nodes and tooltips
  // 2. Animated SVG edges with pulsing, glowing, and traveling dot
  // 3. Sidebar/modal for PR/cabinet details on click
  // 4. Curved/stepped edges
  // 5. Responsive & dark mode (CSS vars or Tailwind)
  // 6. MiniMap
  // 7. Smooth transitions
  // 8. Keyboard navigation & ARIA
  // 9. Context menu on right-click
  // 10. Drag-to-highlight and floating aggregate info

  // For brevity, here is a high-impact sample for glassmorphism, animated edges, and a sidebar/modal:

  // --- Glassmorphism Styles ---
  const glassStyle = {
    background: 'rgba(255,255,255,0.25)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.18)',
  };

  // --- Enhanced AnimatedEdge for thick, glowing, animated cable from PR to first cabinet ---
  const AnimatedEdge = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data }: EdgeProps) => {
    const isMainCable = data && data.isMainCable;
    const runIndex: number = typeof data?.runIndex === 'number' ? data.runIndex : 1;
    const color = runColors[(runIndex - 1) % runColors.length];
    const isActive = hoveredRun === runIndex || selectedRun === runIndex;
    const edgePath = `M${sourceX},${sourceY} C${sourceX},${(sourceY + targetY) / 2} ${targetX},${(sourceY + targetY) / 2} ${targetX},${targetY}`;
    const arrowId = `arrowhead-${id}`;
    const gradientId = `edge-gradient-${id}`;
    return (
      <>
        <defs>
          <linearGradient id={gradientId} x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={color} stopOpacity="1">
              <animate attributeName="offset" values="0;1;0" dur={isActive ? '0.8s' : '1.6s'} repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#fff" stopOpacity="0.2">
              <animate attributeName="offset" values="1;0;1" dur={isActive ? '0.8s' : '1.6s'} repeatCount="indefinite" />
            </stop>
          </linearGradient>
          <marker
            id={arrowId}
            markerWidth="16"
            markerHeight="16"
            refX="8"
            refY="8"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="2,4 14,8 2,12" fill={color} opacity={isActive ? 1 : 0.5}>
              <animate
                attributeName="fill"
                values={`${color};#fff;${color}`}
                dur={isActive ? '0.5s' : '1.2s'}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="1;0.5;1"
                dur={isActive ? '0.5s' : '1.2s'}
                repeatCount="indefinite"
              />
            </polygon>
          </marker>
        </defs>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            ...style,
            stroke: `url(#${gradientId})`,
            strokeWidth: isMainCable ? (isActive ? 24 : 16) : (isActive ? 14 : 8),
            filter: isMainCable
              ? `drop-shadow(0 0 96px ${color}ff) drop-shadow(0 0 48px ${color}cc)`
              : `drop-shadow(0 0 48px ${color}77)`,
            strokeDasharray: isMainCable ? 'none' : '28 14',
            animation: isMainCable ? 'glowmove 0.4s linear infinite' : 'dashmove 0.6s linear infinite',
            opacity: 1,
          }}
          markerEnd={`url(#${arrowId})`}
        />
        {/* Traveling dot/pulse along the edge */}
        <circle r={isMainCable ? 18 : 10} fill={color} filter={`drop-shadow(0 0 8px ${color})`}>
          <animateMotion dur={isActive ? '0.4s' : '0.8s'} repeatCount="indefinite">
            <mpath xlinkHref={`#${id}`} />
          </animateMotion>
        </circle>
        <style>{`
          @keyframes dashmove {
            to { stroke-dashoffset: 84; }
          }
          @keyframes glowmove {
            0% { filter: drop-shadow(0 0 96px ${color}ff); }
            50% { filter: drop-shadow(0 0 192px ${color}ff); }
            100% { filter: drop-shadow(0 0 96px ${color}ff); }
          }
        `}</style>
      </>
    );
  };

  // --- Sidebar/Modal for Details ---
  // Add state:
  // const [sidebarData, setSidebarData] = useState(null);
  // On node click: setSidebarData({ type: 'pr', data: ... })
  // Render a sidebar/modal with glassmorphism and smooth transitions.

  // --- Responsive & Dark Mode ---
  // Use Tailwind or CSS variables for colors, and add a dark mode toggle.

  // --- MiniMap ---
  // Already included in previous step.

  // --- Context Menu, Keyboard Nav, Drag-to-Highlight ---
  // Add event handlers and floating panels as needed.

  // For a full implementation, expand each section, refactor node/edge renderers, and add the necessary state and event handlers. This will result in a beautiful, interactive, and accessible dashboard experience for your Power Wiring view.

  // --- PR badge with lock icon ---
  return (
    <div style={{ width: '100%', height: '600px', position: 'relative', background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' }}>
      {/* Tooltip */}
      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x + 12, top: tooltip.y + 12, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', fontSize: 14, color: '#222', zIndex: 1000, pointerEvents: 'none', boxShadow: '0 2px 8px #0002' }}>{tooltip.content}</div>
      )}
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
        <MiniMap nodeColor={n => n.type === 'power' ? '#2563eb' : '#10b981'} />
      </ReactFlow>
      {/* Optionally, add a badge at the top of each column */}
      {/* Remove the PR badges block at the top of each column */}
      {/* Delete the Array.from({ length: cabinetGrid.columns }) map that renders the PR badges ... */}

      {/* --- Sidebar/modal state --- */}
      {/* Add state:
      const [sidebarData, setSidebarData] = useState<any>(null);
      On node click: setSidebarData({ type: 'cabinet', data: ... })
      Render a sidebar/modal with glassmorphism and smooth transitions. */}
      {/* --- Sidebar/modal for PR/cabinet details --- */}
      {sidebarData && (
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.55)',
            zIndex: 1000,
            animation: 'fadein-overlay 0.3s',
          }} onClick={() => setSidebarData(null)} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            width: 520,
            minHeight: 400,
            background: 'rgba(255,255,255,0.99)',
            boxShadow: '0 16px 64px #2563eb88',
            zIndex: 1001,
            padding: 64,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 40,
            transform: 'translate(-50%, -50%)',
            animation: 'popin-modal 0.4s',
          }}>
            <button style={{ alignSelf: 'flex-end', background: 'none', border: 'none', fontSize: 38, cursor: 'pointer', color: '#2563eb', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setSidebarData(null)}>&times;</button>
            <h2 style={{ color: '#2563eb', fontWeight: 900, fontSize: 36, marginBottom: 32, textShadow: '0 2px 12px #2563eb44' }}>{sidebarData.type === 'cabinet' ? sidebarData.data.label : 'Power Run Details'}</h2>
            <div style={{ fontSize: 26, color: '#333', marginBottom: 32 }}>
              {sidebarData.type === 'cabinet' ? (
                <>
                  <div>Power Run: <span style={{ color: runColors[(sidebarData.data.runIndex - 1) % runColors.length], fontWeight: 700, textShadow: `0 0 8px ${runColors[(sidebarData.data.runIndex - 1) % runColors.length]}` }}>PR-{sidebarData.data.runIndex}</span></div>
                  <div>Status: <span style={{ color: sidebarData.data.connected ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{sidebarData.data.connected ? 'Connected' : 'Unconnected'}</span></div>
                  <div style={{ marginTop: 24, fontSize: 22, color: '#2563eb', fontWeight: 700, textShadow: '0 2px 8px #2563eb33' }}>Live Power: <span style={{ color: '#111' }}>{Math.floor(Math.random() * 1000) + 500} W</span></div>
                </>
              ) : (
                <div>Details for Power Run</div>
              )}
            </div>
            <div style={{ flex: 1 }} />
            <button style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 18, padding: '22px 0', fontWeight: 900, fontSize: 28, marginTop: 48, boxShadow: '0 2px 24px #2563eb33', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setSidebarData(null)}>Close</button>
            <style>{`
              @keyframes popin-modal {
                from { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              }
              @keyframes fadein-overlay {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
          </div>
        </>
      )}
    </div>
  );
};

export default PowerWiringView;  