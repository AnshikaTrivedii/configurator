import React, { useState } from 'react';
import { DisplayConfigurator } from './components/DisplayConfigurator';
import UserTypeModal, { UserType } from './components/UserTypeModal';

function App() {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [modalOpen, setModalOpen] = useState(true);

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