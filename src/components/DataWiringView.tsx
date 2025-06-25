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

const DataHubNode = ({ data }: any) => (
  <div className="relative bg-gradient-to-br from-blue-100 to-blue-200 border-3 border-blue-500 rounded-xl shadow-xl p-6 min-w-40 text-center">
    <div className="flex justify-center mb-2">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <div className="w-4 h-4 bg-white rounded-sm"></div>
      </div>
    </div>
    <div className="text-lg font-bold text-blue-800 mb-1">{data.label}</div>
    <div className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-md">{data.additionalInfo}</div>
    <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 flex gap-1">
      <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
      <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
    </div>
    <Handle type="source" position={Position.Right} style={{ background: '#ff0000' }} />
  </div>
);

const DataCabinetNode = ({ data }: any) => (
  <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg shadow-md p-4 min-w-28 text-center">
    <div className="text-sm font-bold text-blue-700 mb-1">{data.label}</div>
    <div className="text-xs text-blue-500 font-medium uppercase tracking-wide">DATA</div>
    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
    {/* Incoming cables */}
    <Handle type="target" position={Position.Left} id="left-target" style={{ background: '#ff0000' }} />
    <Handle type="target" position={Position.Top} id="top-target" style={{ background: '#ff0000' }} />
    <Handle type="target" position={Position.Right} id="right-target" style={{ background: '#ff0000' }} />
    {/* Outgoing cables */}
    <Handle type="source" position={Position.Right} id="right-source" style={{ background: '#ff0000' }} />
    <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#ff0000' }} />
    <Handle type="source" position={Position.Left} id="left-source" style={{ background: '#ff0000' }} />
  </div>
);

const nodeTypes = {
  dataHub: DataHubNode,
  dataCabinet: DataCabinetNode,
};

interface Props {
  product: Product;
  cabinetGrid: CabinetGrid;
}

const DataWiringView: React.FC<Props> = ({ product, cabinetGrid }) => {
  const generateNodesAndEdges = useMemo(() => {
    const cols = cabinetGrid.columns;
    const rows = cabinetGrid.rows;
    const totalCabinets = cols * rows;

    const nodes = [];
    const edges = [];

    nodes.push({
      id: 'data-hub',
      type: 'dataHub',
      position: { x: 50, y: 50 },
      data: { label: 'Data Hub', additionalInfo: 'Single cable' },
    });

    const startX = 350;
    const startY = 150;
    const spacingX = 140;
    const spacingY = 120;

    let nodeId = 1;
    for (let row = 0; row < rows; row++) {
      const isEven = row % 2 === 0;
      const rowStart = isEven ? 0 : cols - 1;
      const rowEnd = isEven ? cols : -1;
      const step = isEven ? 1 : -1;

      for (let col = rowStart; col !== rowEnd; col += step) {
        const posX = startX + col * spacingX;
        const posY = startY + row * spacingY;
        nodes.push({
          id: `cabinet-${nodeId}`,
          type: 'dataCabinet',
          position: { x: posX, y: posY },
          data: { label: `Cabinet ${nodeId}`, additionalInfo: "" },
        });
        nodeId++;
      }
    }

    if (totalCabinets > 0) {
      edges.push({
        id: 'hub-to-first',
        source: 'data-hub',
        target: 'cabinet-1',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#ff0000', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#ff0000' },
      });

      for (let i = 1; i < totalCabinets; i++) {
        const sourceRow = Math.floor((i - 1) / cols);
        const isSourceRowEven = sourceRow % 2 === 0;

        if (i % cols === 0) {
          // Vertical connection
          edges.push({
            id: `data-${i}-to-${i + 1}`,
            source: `cabinet-${i}`,
            target: `cabinet-${i + 1}`,
            type: 'smoothstep',
            animated: true,
            sourceHandle: 'bottom',
            targetHandle: 'top-target',
            style: { stroke: '#ff0000', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ff0000' },
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
          type: 'smoothstep',
          animated: true,
          sourceHandle: sourceHandle,
          targetHandle: targetHandle,
          style: { stroke: '#ff0000', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ff0000' },
        });
      }
    }

    return { nodes, edges };
  }, [cabinetGrid]);

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
