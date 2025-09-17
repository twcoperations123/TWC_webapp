import React from 'react';
import { type LinkProps } from 'react-router-dom';
import { useNavigationProgress } from '../contexts/NavigationProgressContext';

interface ProgressLinkProps extends Omit<LinkProps, 'to'> {
  children: React.ReactNode;
  to: string; // Simplified to string only for our use case
}

const ProgressLink: React.FC<ProgressLinkProps> = ({ children, onClick, to, ...props }) => {
  const { startNavigation } = useNavigationProgress();

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Prevent default navigation
    
    // Only trigger navigation progress for different routes
    const currentPath = window.location.pathname;
    
    if (currentPath !== to) {
      // Start the enhanced navigation with data preloading
      await startNavigation(to);
    }
    
    // Call the original onClick if provided
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <a 
      href={to} 
      onClick={handleClick}
      className={props.className}
      {...(props as any)} // Cast to any to avoid TypeScript issues with spread
    >
      {children}
    </a>
  );
};

export default ProgressLink;
