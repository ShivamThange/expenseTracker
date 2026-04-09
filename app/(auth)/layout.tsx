import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md p-8 space-y-6 card-glass rounded-sm relative z-10 border-t-2 border-t-primary/50">
        {children}
      </div>
    </div>
  );
}
