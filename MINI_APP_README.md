# Snarkels Mini App

Snarkels is now wrapped with Mini App functionality, making it perfect for onchain social experiences! 🚀

## What is a Mini App?

Mini Apps are lightweight, expressive web applications that live directly inside social feeds. They launch instantly without installation and provide rich, interactive experiences that respond to your onchain identity.

## Features

### 🎯 **Social Context Awareness**
- Automatically detects when running as a Mini App
- Shows user's Farcaster ID (FID) and profile information
- Displays social context (location, client status)
- Adapts UI based on social environment

### 🌐 **Network Support**
- **Base Network (Default)**: Primary network for rewards and interactions
- **Celo Network**: Alternative network support
- Automatic chain switching when needed
- Network-specific token configurations

### 🔗 **Social Integration**
- Farcaster Frame support
- Social sharing capabilities
- Mini App meta tags for proper embedding
- Responsive design for mobile social feeds

## How It Works

### 1. **Mini App Detection**
The app automatically detects when it's running as a Mini App using OnchainKit's `useMiniKit` hook:

```tsx
import { useMiniApp } from '@/hooks/useMiniApp';

const { isMiniApp, userFid, username, displayName, pfpUrl, isAdded, location } = useMiniApp();
```

### 2. **Social Context Display**
When running as a Mini App, users see:
- **Mini App Header**: Welcome message with user info
- **Context Display**: FID, location, and app status
- **Social Features**: Share buttons, social interactions

### 3. **Network Switching**
- Base is set as the default network
- Automatic chain switching when creating quizzes with rewards
- Network-specific token selection

## Components

### `MiniAppWrapper`
Wraps the entire app with Mini App functionality:
```tsx
<MiniKitProvider chain={base}>
  {children}
</MiniKitProvider>
```

### `MiniAppHeader`
Shows social context and user information:
- User profile (FID, username, display name, profile picture)
- Mini App status (added to favorites)
- Location context
- Welcome message

### `MiniAppContextDisplay`
Compact display showing Mini App status:
- Mini App indicator
- Social context information
- User FID and location

### `SocialShareButton`
Smart sharing that works in Mini App contexts:
- Native sharing when available
- Fallback to clipboard copy
- Social-optimized share text

## Configuration

### Default Network: Base
```tsx
// context/index.tsx
defaultNetwork: base, // Set Base as default network

// config/index.tsx
export const networks = [base, celo]; // Base first, then Celo
```

### Mini App Meta Tags
```html
<meta name="fc:miniapp" content='{"version":"1","imageUrl":"...","button":{"title":"🎯 Start Quiz","action":{"type":"launch_miniapp","url":"..."}}}' />
<meta name="fc:frame" content='{"version":"1","imageUrl":"...","button":{"title":"🎯 Start Quiz","action":{"type":"launch_frame","url":"..."}}}' />
```

## Usage

### Running as a Mini App
1. **Embed in Farcaster**: Use the Frame meta tags
2. **Launch from social feed**: Users can click to open
3. **Social context**: App automatically detects Mini App environment
4. **Rich interactions**: Full quiz creation and participation

### Running as Regular Web App
1. **Normal functionality**: All features work as expected
2. **No Mini App UI**: Social components are hidden
3. **Full experience**: Complete quiz platform

## Social Features

### Quiz Sharing
- Share quiz codes with social context
- Optimized for social platforms
- Include user's Farcaster identity

### Social Context
- Know who opened the app
- Adapt to social environment
- Provide personalized experiences

### Mini App Status
- Show when added to favorites
- Display launch location
- Social engagement metrics

## Development

### Adding Mini App Features
```tsx
import { useMiniApp } from '@/hooks/useMiniApp';

function MyComponent() {
  const { isMiniApp, userFid } = useMiniApp();
  
  if (isMiniApp) {
    // Mini App specific logic
    return <MiniAppVersion />;
  }
  
  // Regular web app logic
  return <WebAppVersion />;
}
```

### Testing Mini App
1. **Local development**: Use MiniKit development tools
2. **Frame testing**: Test as Farcaster Frame
3. **Social testing**: Deploy and test in actual social contexts

## Deployment

### Vercel (Recommended)
```bash
pnpm build
vercel --prod
```

### Environment Variables
```env
NEXT_PUBLIC_PROJECT_ID=your_reown_project_id
```

## Benefits

### For Users
- **Instant access**: No installation required
- **Social integration**: Works seamlessly in social feeds
- **Rich experience**: Full quiz functionality
- **Onchain identity**: Uses Farcaster ID for authentication

### For Developers
- **Social distribution**: Direct access to social users
- **Rich context**: User identity and social environment
- **Network support**: Base and Celo integration
- **Easy deployment**: Standard Next.js deployment

## Future Enhancements

- [ ] Push notifications for Mini App users
- [ ] Social leaderboards and achievements
- [ ] Collaborative quiz creation
- [ ] Social quiz challenges
- [ ] Integration with more social platforms

---

**Snarkels Mini App** - Bringing interactive quizzes to onchain social! 🎯✨
