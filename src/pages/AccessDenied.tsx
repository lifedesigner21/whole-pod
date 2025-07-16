// AccessDenied.tsx
import React from 'react';

const AccessDenied = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-700">
          Your email is not whitelisted to use this system. Contact the admin for access.
        </p>
      </div>
    </div>
  );
};

export default AccessDenied;
