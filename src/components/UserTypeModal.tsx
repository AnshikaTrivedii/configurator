import React, { useState } from 'react';
import { User, Briefcase, Users } from 'lucide-react';

const USER_TYPE_KEY = 'selectedUserType';

export type UserType = 'endUser' | 'siChannel' | 'reseller';

interface UserTypeModalProps {
  isOpen: boolean;
  onSelect: (userType: UserType) => void;
}

const userTypeOptions = [
  { value: 'endUser', label: 'End Customer Price', icon: <User className="w-6 h-6 mr-2 text-blue-600" /> },
  { value: 'siChannel', label: 'SI Price / Channel Price', icon: <Briefcase className="w-6 h-6 mr-2 text-green-600" /> },
  { value: 'reseller', label: 'Reseller Price / Lowest Price to Channel', icon: <Users className="w-6 h-6 mr-2 text-purple-600" /> },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[340px] max-w-[90vw] flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Select User Type</h2>
        <p className="text-gray-500 mb-6 text-center max-w-xs">Choose your user type to see the most relevant pricing for your needs. You can only select this once per session.</p>
        <div className="flex flex-col gap-4 w-full mb-6">
          {userTypeOptions.map(option => (
            <button
              key={option.value}
              className={`flex items-center w-full py-3 px-4 rounded-xl border-2 transition-all text-left text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-400
                ${selected === option.value ? 'border-blue-600 bg-blue-50 shadow' : 'border-gray-200 bg-gray-50 hover:bg-blue-100'}`}
              onClick={() => handleSelect(option.value as UserType)}
              type="button"
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
        <button
          className={`w-full py-2.5 rounded-lg font-semibold text-white transition-colors text-lg shadow-md
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