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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Product, CabinetGrid } from '../types';

// Power Distribution Node
const PowerNode = ({ data }: any) => (
  <div className="relative bg-red-100 border-2 border-red-400 rounded-xl shadow-xl p-6 min-w-40 text-center">
    <div className="flex justify-center mb-2">
      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
        <svg width="20" height="20" fill="none"><path d="M10 2v8m0 0V2m0 8l3 3m-3-3l-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    </div>
    <div className="text-lg font-bold text-red-800 mb-1">{data.label}</div>
    <Handle type="source" position={Position.Top} style={{ background: '#ff0000' }} />
  </div>
);

// LED Cabinet Node
const LEDPanelNode = ({ data }: any) => (
  <div className="relative bg-blue-50 border-2 border-blue-400 rounded-lg shadow-md p-4 min-w-28 text-center">
    <div className="text-sm font-bold text-blue-700 mb-1">{data.label}</div>
    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
    <Handle type="target" position={Position.Left} style={{ background: '#ff0000' }} />
    <Handle type="target" position={Position.Top} style={{ background: '#ff0000' }} />
    <Handle type="target" position={Position.Right} style={{ background: '#ff0000' }} />
    <Handle type="source" position={Position.Right} style={{ background: '#ff0000' }} />
    <Handle type="source" position={Position.Bottom} style={{ background: '#ff0000' }} />
    <Handle type="source" position={Position.Left} style={{ background: '#ff0000' }} />
  </div>
);

const nodeTypes = {
  power: PowerNode,
  ledPanel: LEDPanelNode,
};

interface PowerWiringViewProps {
  product: Product;
  cabinetGrid: CabinetGrid;
}

const PowerWiringView: React.FC<PowerWiringViewProps> = ({ product, cabinetGrid }) => {
  const generateNodesAndEdges = useMemo(() => {
    const cols = cabinetGrid.columns;
    const rows = cabinetGrid.rows;
    const totalCabinets = cols * rows;
    const area = (product?.cabinetDimensions?.width || 0) * cols / 1000 * (product?.cabinetDimensions?.height || 0) * rows / 1000; // m²
    const powerConsumption = area * 150; // 150W per m²

    const nodes = [];
    const edges = [];

    // Generate LED Cabinet nodes in a grid
    const startX = 200;
    const startY = 50;
    const spacingX = 110;
    const spacingY = 100;

    for (let row = 0; row < rows; row++) {
      for (let groupStart = 0; groupStart < cols; groupStart += 4) {
        // For each cabinet in the group (up to 4)
        for (let i = 0; i < 4 && (groupStart + i) < cols; i++) {
          const col = groupStart + i;
          const cabinetId = `cabinet-${row + 1}-${col + 1}`;
          nodes.push({
            id: cabinetId,
            type: 'ledPanel',
            position: {
              x: startX + col * spacingX,
              y: startY + row * spacingY
            },
            data: {
              label: `Cabinet ${row + 1}-${col + 1}`
            },
          });
        }
      }
    }

    // Power Distribution Node - positioned centrally below the cabinet grid
    const gridCenterX = startX + (cols - 1) * spacingX / 2;
    const powerDistributionY = startY + rows * spacingY + 100;

    nodes.push({
      id: 'power-distribution',
      type: 'power',
      position: { x: gridCenterX, y: powerDistributionY },
      data: {
        label: 'Power Distribution'
      },
    });

    // For each row, group cabinets in sets of 4 (left to right),
    // connect Power Distribution to the first in the group, then chain the rest
    for (let row = 0; row < rows; row++) {
      for (let groupStart = 0; groupStart < cols; groupStart += 4) {
        // Cabinets in this group
        const group: string[] = [];
        for (let i = 0; i < 4 && (groupStart + i) < cols; i++) {
          const col = groupStart + i;
          group.push(`cabinet-${row + 1}-${col + 1}`);
        }
        if (group.length > 0) {
          // Power Distribution to first in group
          edges.push({
            id: `power-to-${group[0]}`,
            source: 'power-distribution',
            target: group[0],
            type: 'straight',
            style: { stroke: '#000000', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#000000' },
          });
          // Chain the rest in the group
          for (let j = 1; j < group.length; j++) {
            edges.push({
              id: `${group[j - 1]}-to-${group[j]}`,
              source: group[j - 1],
              target: group[j],
              type: 'straight',
              style: { stroke: '#000000', strokeWidth: 1.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#000000', width: 12, height: 12 },
            });
          }
        }
      }
    }

    return { nodes, edges };
  }, [product, cabinetGrid]);

  const [nodes, setNodes, onNodesChange] = useNodesState(generateNodesAndEdges.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generateNodesAndEdges.edges);

  useEffect(() => {
    setNodes(generateNodesAndEdges.nodes);
    setEdges(generateNodesAndEdges.edges);
  }, [generateNodesAndEdges, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '600px', background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-transparent"
        fitViewOptions={{ padding: 0.1 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Controls
          position="bottom-right"
          className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200"
        />
        <Background
          color="#e2e8f0"
          gap={30}
          size={1}
          className="opacity-30"
        />
      </ReactFlow>
    </div>
  );
};

export default PowerWiringView; 