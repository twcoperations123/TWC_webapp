import React from 'react';
import { useNavigationProgress } from '../contexts/NavigationProgressContext';

const NavigationProgressBar: React.FC = () => {
  const { isNavigating } = useNavigationProgress();

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-50 h-1 bg-gray-100 shadow-sm">
      <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 progress-slide shadow-sm"></div>
    </div>
  );
};

export default NavigationProgressBar;
