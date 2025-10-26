'use client';

import React, { ReactNode } from 'react';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { base } from '@reown/appkit/networks';

interface MiniAppWrapperProps {
  children: ReactNode;
}

export const MiniAppWrapper: React.FC<MiniAppWrapperProps> = ({ children }) => {
  return (
    <MiniKitProvider chain={base}>
      {children}
    </MiniKitProvider>
  );
};

export default MiniAppWrapper;
