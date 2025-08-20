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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 lg:gap-4">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Monitor size={16} className="text-gray-600 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">
          Fixed Aspect Ratio
        </h3>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {aspectRatios.map((ratio) => (
          <button
            key={ratio.name}
            onClick={() => onRatioChange(ratio.name)}
            className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border transition-all text-xs sm:text-sm lg:text-base ${
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
