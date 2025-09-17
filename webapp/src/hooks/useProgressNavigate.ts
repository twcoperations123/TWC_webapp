import { useNavigationProgress } from '../contexts/NavigationProgressContext';

export const useProgressNavigate = () => {
  const { startNavigation } = useNavigationProgress();

  const progressNavigate = async (to: string) => {
    // Only trigger progress for string paths and different routes
    const currentPath = window.location.pathname;
    if (currentPath !== to) {
      await startNavigation(to);
    }
  };

  return progressNavigate;
};
