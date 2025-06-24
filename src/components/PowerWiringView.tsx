import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PowerNode from './PowerNode';
import LEDPanelNode from './LEDPanelNode';
// import { Configuration } from '../types';

const nodeTypes = {
  power: PowerNode,
  ledPanel: LEDPanelNode,
};

interface PowerWiringViewProps {
  config: any; // Replace 'any' with 'Configuration' if available
}

export const PowerWiringView: React.FC<PowerWiringViewProps> = ({ config }) => {
  const generateNodesAndEdges = useMemo(() => {
    const cabinetWidth = 0.5;
    const cabinetHeight = 0.5;
    const cabinetsHorizontal = Math.ceil(config.width / cabinetWidth);
    const cabinetsVertical = Math.ceil(config.height / cabinetHeight);
    const totalCabinets = cabinetsHorizontal * cabinetsVertical;
    const area = config.width * config.height;
    const powerConsumption = area * 150; // 150W per m²

    const nodes = [];
    const edges = [];

    // Generate LED Cabinet nodes in a grid
    const startX = 200;
    const startY = 50;
    const spacingX = 110;
    const spacingY = 100;

    for (let row = 0; row < cabinetsVertical; row++) {
      for (let col = 0; col < cabinetsHorizontal; col++) {
        const cabinetId = `cabinet-${row + 1}-${col + 1}`;
        nodes.push({
          id: cabinetId,
          type: 'ledPanel',
          position: { 
            x: startX + col * spacingX, 
            y: startY + row * spacingY 
          },
          data: { 
            label: `Cabinet ${row + 1}-${col + 1}`, 
            type: 'power', 
            row: row + 1,
            col: col + 1,
            power: `${(powerConsumption / totalCabinets / 1000).toFixed(1)}kW`
          },
        });
      }
    }

    // Power Distribution Node - positioned centrally below the cabinet grid
    const gridCenterX = startX + (cabinetsHorizontal - 1) * spacingX / 2;
    const powerDistributionY = startY + cabinetsVertical * spacingY + 100;
    
    nodes.push({
      id: 'power-distribution',
      type: 'power',
      position: { x: gridCenterX, y: powerDistributionY },
      data: { 
        label: 'Power Distribution', 
        voltage: `${(powerConsumption / 1000).toFixed(1)} kW`,
        additionalInfo: `${(powerConsumption * 1.5 / 1000).toFixed(1)}kW Total`
      },
    });

    const powerInjectionPoints = [
      { row: 1, col: 5 },
      { row: 2, col: 2 },
      { row: 3, col: 1 },
      { row: 4, col: 2 },
      { row: 4, col: 3 },
      { row: 4, col: 4 },
    ];
    
    powerInjectionPoints.forEach(point => {
      if (point.row <= cabinetsVertical && point.col <= cabinetsHorizontal) {
        const targetId = `cabinet-${point.row}-${point.col}`;
        edges.push({
          id: `power-to-${targetId}`,
          source: 'power-distribution',
          target: targetId,
          type: 'straight',
          style: { stroke: '#000000', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#000000' },
        });
      }
    });

    // Horizontal connections
    for (let row = 1; row <= cabinetsVertical; row++) {
      for (let col = 1; col < cabinetsHorizontal; col++) {
        const sourceId = `cabinet-${row}-${col}`;
        const targetId = `cabinet-${row}-${col + 1}`;
        edges.push({
          id: `${sourceId}-to-${targetId}`,
          source: sourceId,
          target: targetId,
          type: 'straight',
          style: { stroke: '#000000', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#000000', width: 12, height: 12 },
        });
      }
    }
    
    // Vertical connections
    for (let col = 1; col <= cabinetsHorizontal; col++) {
      for (let row = 1; row < cabinetsVertical; row++) {
        const sourceId = `cabinet-${row}-${col}`;
        const targetId = `cabinet-${row + 1}-${col}`;
        edges.push({
          id: `${sourceId}-to-${targetId}`,
          source: sourceId,
          target: targetId,
          type: 'straight',
          style: { stroke: '#000000', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#000000', width: 12, height: 12 },
        });
      }
    }

    return { nodes, edges };
  }, [config]);

  const [nodes, setNodes, onNodesChange] = useNodesState(generateNodesAndEdges.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generateNodesAndEdges.edges);

  // Update nodes and edges when config changes
  React.useEffect(() => {
    const newData = generateNodesAndEdges;
    setNodes(newData.nodes);
    setEdges(newData.edges);
  }, [generateNodesAndEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100" style={{ minHeight: 600 }}>
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