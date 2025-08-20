import React, { useState, useEffect } from 'react';
import { DisplayConfigurator } from './components/DisplayConfigurator';
import UserTypeModal, { UserType, getStoredUserType } from './components/UserTypeModal';

function App() {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [modalOpen, setModalOpen] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    const storedUserType = getStoredUserType();
    if (storedUserType) {
      setUserType(storedUserType);
      setModalOpen(false);
    }
  }, []);

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    setModalOpen(false);
  };

  // Function to clear localStorage and show modal again
  const clearUserType = () => {
    localStorage.removeItem('selectedUserType');
    setUserType(null);
    setModalOpen(true);
  };

  return (
    <>
      {/* Temporary button to clear localStorage and show modal */}
      <button 
        onClick={clearUserType}
        className="fixed top-2 right-2 z-50 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 sm:top-4 sm:right-4 sm:px-3 sm:text-sm"
      >
        Show User Type Modal
      </button>
      
      <UserTypeModal isOpen={modalOpen} onSelect={handleUserTypeSelect} />
      <DisplayConfigurator userType={userType} />
    </>
  );
}

export default App;