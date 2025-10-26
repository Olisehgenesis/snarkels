'use client';

import Head from 'next/head';

interface DynamicMetaProps {
  title?: string;
  description?: string;
  type?: 'website' | 'snarkel' | 'room' | 'featured';
  snarkelCode?: string;
  participants?: string;
  rewards?: string;
  difficulty?: string;
  imageUrl?: string;
  url?: string;
}

export default function DynamicMeta({
  title = 'Snarkels - Interactive Quiz Rewards',
  description = 'On-chain Snarkels rewards users in interactive sessions with ERC20 tokens on Base and Celo networks',
  type = 'website',
  snarkelCode,
  participants,
  rewards,
  difficulty,
  imageUrl,
  url
}: DynamicMetaProps) {
  // Generate dynamic OG image URL with parameters
  const ogImageUrl = (() => {
    if (imageUrl) return imageUrl;
    
    const baseUrl = 'https://snarkels.lol/api/og';
    const params = new URLSearchParams();
    
    if (type !== 'website') {
      params.set('type', type);
    }
    if (title) {
      params.set('title', title);
    }
    if (description) {
      params.set('description', description);
    }
    if (snarkelCode) {
      params.set('code', snarkelCode);
    }
    if (participants) {
      params.set('participants', participants);
    }
    if (rewards) {
      params.set('rewards', rewards);
    }
    if (difficulty) {
      params.set('difficulty', difficulty);
    }
    
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  })();

  // Generate dynamic description based on type
  const dynamicDescription = (() => {
    if (description) return description;
    
    switch (type) {
      case 'snarkel':
        return `Join the ${title} Snarkel! Test your knowledge and earn rewards. Code: ${snarkelCode}`;
      case 'room':
        return `Live Snarkel session: ${title}. Join now and compete with other players!`;
      case 'featured':
        return `Featured Snarkel: ${title}. Discover amazing challenges and test your knowledge.`;
      default:
        return 'On-chain Snarkels rewards users in interactive sessions with ERC20 tokens on Base and Celo networks';
    }
  })();

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={dynamicDescription} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={dynamicDescription} />
      <meta property="og:type" content={type === 'website' ? 'website' : 'article'} />
      <meta property="og:url" content={url || 'https://snarkels.lol'} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Snarkels" />
      
      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={dynamicDescription} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:site" content="@snarkels" />
      
      {/* Additional Meta Tags for Snarkels */}
      {snarkelCode && (
        <>
          <meta property="og:article:tag" content="Snarkel" />
          <meta property="og:article:tag" content="Quiz" />
          <meta property="og:article:tag" content="Web3" />
          <meta property="og:article:tag" content="Blockchain" />
          <meta property="og:article:tag" content="Rewards" />
        </>
      )}
      
      {/* Farcaster Frame Meta Tags */}
      <meta name="fc:frame" content={`{"version":"1","imageUrl":"${ogImageUrl}","button":{"title":"🎯 Join Snarkel","action":{"type":"launch_frame","url":"${url || 'https://snarkels.lol'}","name":"Snarkels","splashImageUrl":"https://snarkels.lol/logo.png","splashBackgroundColor":"#1f2937"}}}`} />
      
      {/* Mini App Meta Tags */}
      <meta name="fc:miniapp" content={`{"version":"1","imageUrl":"${ogImageUrl}","button":{"title":"🎯 Start Snarkel","action":{"type":"launch_miniapp","url":"${url || 'https://snarkels.lol'}","name":"Snarkels","splashImageUrl":"https://snarkels.lol/logo.png","splashBackgroundColor":"#1f2937"}}}`} />
    </Head>
  );
}
