import React, { useMemo, useEffect, useState, useRef } from 'react';
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
  EdgeProps,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Product, CabinetGrid } from '../types';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import download from 'downloadjs';
import jsPDF from 'jspdf';

interface Props {
  product: Product;
  cabinetGrid: CabinetGrid;
}

const PowerWiringView: React.FC<Props> = ({ product, cabinetGrid }) => {

  const [hoveredRun, setHoveredRun] = useState<number | null>(null);
  const [selectedRun, setSelectedRun] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const [sidebarData, setSidebarData] = useState<{
    type: string;
    data: any;
  } | null>(null);

  const flowRef = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<any>(null);
  
  const getFlowViewport = (): HTMLElement | null => {
    if (!flowRef.current) return null;

    const viewport = flowRef.current.querySelector('.react-flow__viewport') as HTMLElement;
    return viewport || flowRef.current;
  };
  
  const exportAsImage = async (format: 'png' | 'jpeg' | 'svg') => {
    const instance = reactFlowInstanceRef.current;
    if (!instance) {

      return;
    }
    
    const viewportElement = getFlowViewport();
    if (!viewportElement) {

      return;
    }

    let currentViewport: any = null;
    
    try {

      currentViewport = instance.getViewport();

      instance.fitView({ padding: 0.2, duration: 200 });

      await new Promise(resolve => setTimeout(resolve, 300));

      const fullWidth = viewportElement.scrollWidth;
      const fullHeight = viewportElement.scrollHeight;
      
      if (fullWidth === 0 || fullHeight === 0) {

        return;
      }

      const options = {
        pixelRatio: 3,
        backgroundColor: 'white',
        quality: 1,
        width: fullWidth,
        height: fullHeight,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
        },
        filter: (node: any) => {

          if (!node || !node.className) return true;
          const className = typeof node.className === 'string' ? node.className : '';
          return !className.includes('react-flow__controls') && 
                 !className.includes('react-flow__minimap') &&
                 !className.includes('react-flow__panel') &&
                 !className.includes('absolute') && // Exclude export buttons
                 !node.classList?.contains('absolute');
        },
      };
      
      let dataUrl: string;
      let filename: string;
      let mimeType: string;
      
      switch (format) {
        case 'png':
          dataUrl = await toPng(viewportElement, options);
          filename = 'power-wiring-diagram.png';
          mimeType = 'image/png';
          break;
        case 'jpeg':
          dataUrl = await toJpeg(viewportElement, options);
          filename = 'power-wiring-diagram.jpg';
          mimeType = 'image/jpeg';
          break;
        case 'svg':
          dataUrl = await toSvg(viewportElement, options);
          filename = 'power-wiring-diagram.svg';
          mimeType = 'image/svg+xml';
          break;
      }

      instance.setViewport(currentViewport);
      
      download(dataUrl, filename, mimeType);
    } catch (error) {

      if (reactFlowInstanceRef.current && currentViewport) {
        try {
          reactFlowInstanceRef.current.setViewport(currentViewport);
        } catch (e) {

        }
      }
    }
  };
  
  const exportAsPDF = async () => {
    const instance = reactFlowInstanceRef.current;
    if (!instance) {

      return;
    }
    
    const viewportElement = getFlowViewport();
    if (!viewportElement) {

      return;
    }

    let currentViewport: any = null;
    
    try {

      currentViewport = instance.getViewport();

      instance.fitView({ padding: 0.2, duration: 200 });

      await new Promise(resolve => setTimeout(resolve, 300));

      const nodes = instance.getNodes();
      if (nodes.length === 0) {

        return;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      
      nodes.forEach(node => {
        const nodeWidth = node.width || 150;
        const nodeHeight = node.height || 100;
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + nodeWidth);
        maxY = Math.max(maxY, node.position.y + nodeHeight);
      });

      const padding = 100;
      const nodeBasedWidth = Math.ceil(maxX - minX + padding * 2);
      const nodeBasedHeight = Math.ceil(maxY - minY + padding * 2);

      const viewportWidth = viewportElement.scrollWidth || viewportElement.clientWidth;
      const viewportHeight = viewportElement.scrollHeight || viewportElement.clientHeight;

      const fullWidth = Math.max(nodeBasedWidth, viewportWidth);
      const fullHeight = Math.max(nodeBasedHeight, viewportHeight);
      
      if (fullWidth === 0 || fullHeight === 0) {

        return;
      }

      const options = {
        pixelRatio: 3,
        backgroundColor: 'white',
        quality: 1,
        width: fullWidth,
        height: fullHeight,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
        },
        filter: (node: any) => {

          if (!node || !node.className) return true;
          const className = typeof node.className === 'string' ? node.className : '';
          return !className.includes('react-flow__controls') && 
                 !className.includes('react-flow__minimap') &&
                 !className.includes('react-flow__panel') &&
                 !className.includes('absolute') && // Exclude export buttons
                 !node.classList?.contains('absolute');
        },
      };

      const dataUrl = await toPng(viewportElement, options);

      instance.setViewport(currentViewport);

      const pdf = new jsPDF('l', 'pt', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfPageWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();

      const imgAspectRatio = imgProps.width / imgProps.height;
      const pdfAspectRatio = pdfPageWidth / pdfPageHeight;
      
      let finalWidth: number;
      let finalHeight: number;
      
      if (imgAspectRatio > pdfAspectRatio) {

        finalWidth = pdfPageWidth;
        finalHeight = pdfPageWidth / imgAspectRatio;
      } else {

        finalHeight = pdfPageHeight;
        finalWidth = pdfPageHeight * imgAspectRatio;
      }

      const xOffset = (pdfPageWidth - finalWidth) / 2;
      const yOffset = (pdfPageHeight - finalHeight) / 2;
      
      pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save('power-wiring-diagram.pdf');
    } catch (error) {

      if (reactFlowInstanceRef.current && currentViewport) {
        try {
          reactFlowInstanceRef.current.setViewport(currentViewport);
        } catch (e) {

        }
      }
    }
  };

  const pixelPitch = product.pixelPitch; // in mm
  const cabinetWidth = product.cabinetDimensions.width; // in mm
  const cabinetHeight = product.cabinetDimensions.height; // in mm

  function getHubColor(index: number, total: number) {
    const hue = (index * 360) / total;
    return `hsl(${hue}, 70%, 50%)`;
  }

  const cabinetAssignments: { [cabinetId: string]: number } = {};
  const generateNodesAndEdges = useMemo(() => {
    const cols = cabinetGrid.columns;
    const rows = cabinetGrid.rows;
    const totalCabinets = cols * rows;

    const nodes: any[] = [];
    const edges: any[] = [];

    const dataHubStartX = 50;
    const dataHubStartY = 50;
    const dataHubSpacingY = 220;
    const dataHubs: { id: string; position: { x: number; y: number }; label: string }[] = [];

    const startX = 350;
    const startY = 150;
    const spacingX = 180; // was 140 or less
    const spacingY = 140; // was 120 or less

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

        cabinetAssignments[cabinetId] = runIndex;

        if (parseInt(cabinetId.split('-')[1], 10) >= 7 && parseInt(cabinetId.split('-')[1], 10) <= 18) {

        }
        cabinetsInRun++;
        if (cabinetsInRun === maxPerRun) {
          runIndex++;
          cabinetsInRun = 0;
          prevCabinetId = null;
        }
      }
    }

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

    let nodeId = 1;
    for (let row = 0; row < rows; row++) {
      const isEven = row % 2 === 0;
      for (let col = 0; col < cols; col++) {
        const actualCol = isEven ? col : cols - 1 - col;
        const posX = startX + actualCol * spacingX;
        const posY = startY + row * spacingY;

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

    if (totalCabinets > 0) {

      for (let i = 0; i < totalHubs; i++) {
        const hubId = `data-hub-${i + 1}`;
        const firstCabinetInRun = `cabinet-${i * maxPerRun + 1}`;
        const color = getHubColor(i, totalHubs);
        if (i === 0) {

          edges.push({
            id: `hub${i + 1}-to-cab${firstCabinetInRun}`,
            source: hubId,
            target: firstCabinetInRun,
            type: 'step',
            animated: true,
            style: { stroke: color, strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
            targetHandle: 'center', // Always enter at the center
          });
        } else {

          const cabNode = nodes.find(n => n.id === firstCabinetInRun);
          const hubNode = nodes.find(n => n.id === hubId);
          if (cabNode && hubNode) {

            const cabIdx = parseInt(firstCabinetInRun.split('-')[1], 10) - 1;
            const cabRow = Math.floor(cabIdx / cols);

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
              targetHandle: 'center', // Always enter at the center
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

        if (thisCabHub !== nextCabHub) continue;
      
        const sourceRow = Math.floor((i - 1) / cols);
        const nextRow = Math.floor(i / cols);
        const currentCol = (i - 1) % cols;
        const isSourceRowEven = sourceRow % 2 === 0;

        const isVerticalConnection = i % cols === 0 && nextRow === sourceRow + 1;
      
        if (isVerticalConnection) {
          edges.push({
            id: `data-${i}-to-${i + 1}-vertical`,
            source: `cabinet-${i}`,
            target: `cabinet-${i + 1}`,
            type: 'straight',
            animated: true,
            sourceHandle: 'bottom',
            targetHandle: 'top-target', // Arrowhead at the top
            style: { stroke: color, strokeWidth: 2, zIndex: 0 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
          });
          continue;
        }

        const sourceHandle = isSourceRowEven ? 'right-source' : 'left-source';
        const targetHandle = isSourceRowEven ? 'left-target' : 'right-target';
        edges.push({
          id: `data-${i}-to-${i + 1}`,
          source: `cabinet-${i}`,
          target: `cabinet-${i + 1}`,
          type: 'step',
          animated: true,
          sourceHandle,
          targetHandle, // Arrowhead at the correct entry side
          style: { stroke: color, strokeWidth: 2, zIndex: 0 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        });
      }      
    }
    return { nodes, edges, groupBackgroundNodes };
  }, [cabinetGrid, product]);

  const [nodes, setNodes, onNodesChange] = useNodesState(generateNodesAndEdges.nodes);

  const filterEdges = (edges: any[]) => {

    const directlyPoweredCabinets = new Set(
      edges
        .filter(e => e.source && e.source.startsWith('data-hub-'))
        .map(e => e.target)
    );

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
        <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ background: color }} />
        <Handle type="target" position={Position.Top} id="center" style={{ background: color, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }} />
        <Handle type="source" position={Position.Right} id="right-source" style={{ background: color }} />
        <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: color }} />
        <Handle type="source" position={Position.Left} id="left-source" style={{ background: color }} />
      </div>
    );
  };

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

  const BendEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data }) => {

    const hasBendPoints = Array.isArray(data?.bendPoints) && data.bendPoints.length > 0;
    let finalTargetX = targetX;
    let finalTargetY = targetY;

    if (hasBendPoints) {
      const bendPoints = Array.isArray(data?.bendPoints) ? (data.bendPoints as { x: number; y: number }[]) : [];
      const lastBend = bendPoints.length > 0 ? bendPoints[bendPoints.length - 1] : undefined;
      if (lastBend) {

        const dx = targetX - lastBend.x;
        const dy = targetY - lastBend.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          finalTargetX = targetX - (dx / len) * 16;
          finalTargetY = targetY - (dy / len) * 16;
        }
      }
    }
    if (!hasBendPoints) {

      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        finalTargetX = targetX - (dx / len) * 16;
        finalTargetY = targetY - (dy / len) * 16;
    }
    }
    let d = `M ${sourceX},${sourceY}`;
    if (hasBendPoints) {
      const bendPoints = Array.isArray(data?.bendPoints) ? (data.bendPoints as { x: number; y: number }[]) : [];
      bendPoints.forEach((pt) => {
      d += ` L ${pt.x},${pt.y}`;
    });
    }
    d += ` L ${finalTargetX},${finalTargetY}`;
    return (
      <>
        <defs>
          <marker
            id={`arrowhead-${id}`}
            markerWidth="24"
            markerHeight="24"
            refX="12"
            refY="12"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="4,8 20,12 4,16" fill={style?.stroke || '#2563eb'} />
          </marker>
        </defs>
        <BaseEdge id={id} path={d} style={style} markerEnd={`url(#arrowhead-${id})`} />
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

  const runColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

  const glassStyle = {
    background: 'rgba(255,255,255,0.25)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.18)',
  };

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

  return (
    <div ref={flowRef} style={{ width: '100%', height: '600px', position: 'relative', background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' }}>
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
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
        }}
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
      
      {/* Export Toolbar */}
      <div className="absolute right-4 bottom-20 flex flex-col gap-2 z-10">
        <button
          onClick={() => exportAsImage('jpeg')}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 font-medium text-sm"
        >
          Export JPEG
        </button>
        <button
          onClick={exportAsPDF}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 font-medium text-sm"
        >
          Export PDF
        </button>
      </div>
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