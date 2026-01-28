import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-surface border border-slate-800 rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};