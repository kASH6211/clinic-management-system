import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const MedicalRecords = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-600">Manage patient medical records and history</p>
        </div>
        <Link to="/medical-records/new" className="btn-primary flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Add Record
        </Link>
      </div>
      
      <div className="card text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Medical Records</h3>
        <p className="text-gray-500 mb-4">Medical records management functionality will be implemented here</p>
        <Link to="/medical-records/new" className="btn-primary">
          Add First Record
        </Link>
      </div>
    </div>
  );
};

export default MedicalRecords;

