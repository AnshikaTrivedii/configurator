import React from "react";
import { Monitor } from "lucide-react";
import { AspectRatio } from "../types";

interface AspectRatioSelectorProps {
  aspectRatios: AspectRatio[];
  selectedRatio: string | null;
  onRatioChange: (ratio: string) => void;
}
// aspect ration functions
export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  aspectRatios,
  selectedRatio,
  onRatioChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-2">
        <Monitor size={18} className="text-gray-600" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">
          Fixed Aspect Ratio
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {aspectRatios.map((ratio) => (
          <button
            key={ratio.name}
            onClick={() => onRatioChange(ratio.name)}
            className={`px-3 sm:px-4 py-2 rounded-lg border transition-all text-sm sm:text-base ${
              selectedRatio === ratio.name
                ? "bg-blue-500 text-white border-blue-500 shadow-lg"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            }`}
          >
            {ratio.label}
          </button>
        ))}
      </div>
    </div>
  );
};
