import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../ui';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="w-20 h-20 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-extrabold tracking-wider">
          404
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h1>
        <p className="text-slate-500 mb-8 text-sm">
          Sorry, the page you are looking for doesn't exist, has been moved, or is temporarily unavailable.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
          <Link to="/">
            <Button variant="primary" icon={Home}>
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
