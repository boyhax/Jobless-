import React from 'react';
import { cn } from '../../lib/utils';

export const Avatar = ({ src, name, size = 'md', className }: { src?: string | null; name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) => {
  const sizes = { 
    sm: 'w-8 h-8 text-xs', 
    md: 'w-10 h-10 text-sm', 
    lg: 'w-20 h-20 text-xl',
    xl: 'w-32 h-32 text-2xl'
  };
  return (
    <div className={cn('rounded-full bg-neutral-200 flex items-center justify-center font-medium text-neutral-600 overflow-hidden shrink-0 border border-neutral-100', sizes[size], className)}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : name.charAt(0)}
    </div>
  );
};
