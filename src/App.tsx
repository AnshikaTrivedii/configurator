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

  return (
    <>
      <UserTypeModal isOpen={modalOpen} onSelect={handleUserTypeSelect} />
      <DisplayConfigurator userType={userType} />
    </>
  );
}

export default App;