import React from 'react';

interface EmailTemplateProps {
  productName: string;
  message: string;
  resolution?: string;
  pixelPitch?: number;
  gridColumns?: number;
  gridRows?: number;
  displayArea?: string;
  userType?: string;
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
  productName,
  message,
  resolution,
  pixelPitch,
  gridColumns,
  gridRows,
  displayArea,
  userType
}) => {
  return (
    <div>
      <h1>New Quote Request for {productName}</h1>
      <p><strong>Message:</strong> {message}</p>
      
      {userType && (
        <p><strong>User Type:</strong> {userType}</p>
      )}
      
      {resolution && (
        <p><strong>Resolution:</strong> {resolution}</p>
      )}
      
      {pixelPitch !== undefined && (
        <p><strong>Pixel Pitch:</strong> {pixelPitch}mm</p>
      )}
      
      {gridColumns !== undefined && gridRows !== undefined && (
        <p><strong>Grid Size:</strong> {gridColumns} × {gridRows}</p>
      )}
      
      {displayArea && (
        <p><strong>Display Area:</strong> {displayArea}</p>
      )}
    </div>
  );
};
