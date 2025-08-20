import React, { useState } from 'react';
import { User, Briefcase, Users } from 'lucide-react';

const USER_TYPE_KEY = 'selectedUserType';

export type UserType = 'endUser' | 'siChannel' | 'reseller';

interface UserTypeModalProps {
  isOpen: boolean;
  onSelect: (userType: UserType) => void;
}

const userTypeOptions = [
  { value: 'endUser', label: 'End Customer', icon: <User className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" /> },
  { value: 'siChannel', label: 'SI / Channel', icon: <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" /> },
  { value: 'reseller', label: 'Reseller / Lowest Price to Channel', icon: <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" /> },
];

const UserTypeModal: React.FC<UserTypeModalProps> = ({ isOpen, onSelect }) => {
  const [selected, setSelected] = useState<UserType | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = (value: UserType) => {
    setSelected(value);
  };

  const handleConfirm = () => {
    if (selected) {
      localStorage.setItem(USER_TYPE_KEY, selected);
      setConfirmed(true);
      onSelect(selected);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-fade-in p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 w-full max-w-xs sm:max-w-sm lg:max-w-md flex flex-col items-center">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2 text-gray-900 text-center">Select User Type</h2>
        <p className="text-gray-500 mb-3 sm:mb-4 lg:mb-6 text-center max-w-xs text-xs sm:text-sm lg:text-base">Choose your user type to see the most relevant pricing for your needs. You can only select this once per session.</p>
        <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4 w-full mb-3 sm:mb-4 lg:mb-6">
          {userTypeOptions.map(option => (
            <button
              key={option.value}
              className={`flex items-center w-full py-2.5 sm:py-3 lg:py-3 px-3 sm:px-4 rounded-xl border-2 transition-all text-left text-sm sm:text-base lg:text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-400
                ${selected === option.value ? 'border-blue-600 bg-blue-50 shadow' : 'border-gray-200 bg-gray-50 hover:bg-blue-100'}`}
              onClick={() => handleSelect(option.value as UserType)}
              type="button"
            >
              {option.icon}
              <span className="text-xs sm:text-sm lg:text-base">{option.label}</span>
            </button>
          ))}
        </div>
        <button
          className={`w-full py-2 sm:py-2.5 lg:py-2.5 rounded-lg font-semibold text-white transition-colors text-sm sm:text-base lg:text-lg shadow-md
            ${selected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
          onClick={handleConfirm}
          disabled={!selected}
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

export function getStoredUserType(): UserType | null {
  const value = localStorage.getItem(USER_TYPE_KEY);
  if (value === 'endUser' || value === 'siChannel' || value === 'reseller') return value;
  return null;
}

export default UserTypeModal; 