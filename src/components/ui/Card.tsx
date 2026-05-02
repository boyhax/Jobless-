import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm', className)}>
    {children}
  </div>
);
