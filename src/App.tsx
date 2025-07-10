import React, { useState, useEffect } from 'react';
import { DisplayConfigurator } from './components/DisplayConfigurator';
import UserTypeModal, { getStoredUserType, UserType } from './components/UserTypeModal';

function App() {
  const [userType, setUserType] = useState<UserType | null>(getStoredUserType());
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!userType) setModalOpen(true);
  }, [userType]);

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