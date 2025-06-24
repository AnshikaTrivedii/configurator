import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Monitor, Cpu } from 'lucide-react';

type LEDPanelNodeProps = {
  data: {
    label: string;
    type: string;
    row: number;
    col: number;
    power?: string;
  };
};

const LEDPanelNode: React.FC<LEDPanelNodeProps> = ({ data }) => (
  <div 
    className="relative bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-500 rounded-lg shadow-lg p-3 min-w-20 text-center"
    style={{
      boxShadow: '0 4px 15px -3px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.05)',
    }}
  >
    <Handle
      type="target"
      position={Position.Left}
      id="power-in"
      className="w-2.5 h-2.5 bg-blue-500 border border-white rounded-full"
      style={{ left: -5 }}
    />

    {data.col < 4 && (
      <Handle
        type="source"
        position={Position.Right}
        id="power-out"
        className="w-2.5 h-2.5 bg-blue-500 border border-white rounded-full"
        style={{ right: -5 }}
      />
    )}

    {/* LED Panel Icon */}
    <div className="flex justify-center mb-1">
      <Monitor className="w-4 h-4 text-blue-600" />
    </div>

    {/* Label */}
    <div className="text-xs font-bold text-blue-800 mb-1">
      {data.label}
    </div>

    {/* Power Rating */}
    {data.power && (
      <div className="text-xs text-blue-600 font-medium bg-blue-50 px-1 py-0.5 rounded">
        {data.power}
      </div>
    )}

    {/* Status LED */}
    <div 
      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
      style={{
        boxShadow: '0 0 4px rgba(16, 185, 129, 0.8)',
      }}
    />
  </div>
);

export default LEDPanelNode; 