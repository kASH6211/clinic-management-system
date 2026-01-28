import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MedicalRecordDetails = () => {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => navigate('/medical-records')}
          className="mr-4 p-2 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Record Details</h1>
          <p className="text-gray-600">Medical record details will be implemented here</p>
        </div>
      </div>
      
      <div className="card text-center py-12">
        <p className="text-gray-500">Medical record details component will be implemented here</p>
      </div>
    </div>
  );
};

export default MedicalRecordDetails;

