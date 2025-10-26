'use client';

import React from 'react';

export default function AppKitProvider({ children }: { children: React.ReactNode }) {
  // Note: AppKit is already created in config/index.tsx
  // This component just provides the context for the children
  // The conditional logic for Farcaster vs regular web will be handled
  // by AppKit's built-in detection and the components that use it

  return <>{children}</>;
}
