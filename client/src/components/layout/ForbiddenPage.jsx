import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import Button from '../ui/Button';

export const ForbiddenPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 mb-4 shadow-xs">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">403 - Access Denied</h1>
      <p className="mt-2 text-base text-slate-600 max-w-md">
        You do not have permission to view or manage this section of the municipal infrastructure portal.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          prefixIcon={ArrowLeft}
        >
          Go Back
        </Button>
        <Link to="/dashboard">
          <Button variant="primary" prefixIcon={Home}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ForbiddenPage;
