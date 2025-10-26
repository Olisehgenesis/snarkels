'use client';

import { useMiniKit } from '@coinbase/onchainkit/minikit';

export const useMiniApp = () => {
  const miniKit = useMiniKit();
  
  return {
    context: miniKit?.context,
    isMiniApp: !!miniKit?.context,
    userFid: miniKit?.context?.user?.fid,
    username: miniKit?.context?.user?.username,
    displayName: miniKit?.context?.user?.displayName,
    pfpUrl: miniKit?.context?.user?.pfpUrl,
    isAdded: miniKit?.context?.client?.added,
    location: miniKit?.context?.location,
  };
};

export default useMiniApp;
