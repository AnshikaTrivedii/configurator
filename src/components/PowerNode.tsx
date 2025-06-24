import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Power } from 'lucide-react';

type PowerNodeProps = {
  data: {
    label: string;
    voltage: string;
    additionalInfo?: string;
  };
};

const PowerNode: React.FC<PowerNodeProps> = ({ data }) => (
  <div 
    className="relative bg-gradient-to-br from-red-100 to-red-200 border-4 border-red-500 rounded-xl shadow-xl p-4 min-w-32 text-center"
    style={{
      boxShadow: '0 8px 25px -5px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    }}
  >
    <Handle
      type="source"
      position={Position.Right}
      id="power-out"
      className="w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-lg"
      style={{ right: -6 }}
    />

    {/* Power Icon */}
    <div className="flex justify-center mb-2">
      <Power className="w-6 h-6 text-red-600" />
    </div>

    {/* Label */}
    <div className="text-sm font-bold text-red-800 mb-1">
      {data.label}
    </div>

    {/* Voltage */}
    <div className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-md inline-block mb-1">
      {data.voltage}
    </div>

    {/* Additional Info */}
    {data.additionalInfo && (
      <div className="text-xs text-red-600 font-medium">
        {data.additionalInfo}
      </div>
    )}

    {/* Power indicator dots */}
    <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-1">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-red-500 shadow-lg animate-pulse"
          style={{
            animationDelay: `${i * 0.2}s`,
            boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)',
          }}
        />
      ))}
    </div>
  </div>
);

export default PowerNode; 