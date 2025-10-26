import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // Get dynamic parameters for different page types
  const type = searchParams.get('type') || 'default'
  const title = searchParams.get('title') || 'Snarkels'
  const description = searchParams.get('description') || 'On-chain Snarkels rewards users in interactive sessions with ERC20 tokens'
  const snarkelCode = searchParams.get('code')
  const participants = searchParams.get('participants')
  const rewards = searchParams.get('rewards')
  const difficulty = searchParams.get('difficulty')
  
  // Customize the image based on the type
  let backgroundColor = '#1f2937'
  let accentColor = '#f59e0b'
  let icon = '🎯'
  
  if (type === 'snarkel' && snarkelCode) {
    backgroundColor = '#1e40af'
    accentColor = '#10b981'
    icon = '🧠'
  } else if (type === 'room') {
    backgroundColor = '#7c3aed'
    accentColor = '#f59e0b'
    icon = '🎮'
  } else if (type === 'featured') {
    backgroundColor = '#059669'
    accentColor = '#fbbf24'
    icon = '⭐'
  }
 
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: backgroundColor,
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${accentColor} 0%, #f97316 50%, #ea580c 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '50px',
              fontWeight: 'bold',
              color: 'white',
              boxShadow: `0 20px 40px ${accentColor}40`,
            }}
          >
            {icon}
          </div>
        </div>
        
        <div
          style={{
            fontSize: '64px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textAlign: 'center',
            marginBottom: '15px',
            textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          }}
        >
          {title}
        </div>
        
        <div
          style={{
            fontSize: '28px',
            color: '#ffffff',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: '1.5',
            marginBottom: '25px',
            fontWeight: '600',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
          }}
        >
          {description}
        </div>
        
        {/* Show Snarkel-specific details if available */}
        {snarkelCode && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '20px',
              fontSize: '24px',
              color: '#ffffff',
              fontWeight: '600',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
              padding: '12px 24px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <span>🔑</span>
            <span>Code: {snarkelCode}</span>
          </div>
        )}
        
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '35px',
            fontSize: '20px',
            color: '#ffffff',
            fontWeight: '600',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
          }}
        >
          <span>🔗</span>
          <span>On-Chain</span>
          <span>•</span>
          <span>🎯</span>
          <span>Interactive</span>
          <span>•</span>
          <span>🪙</span>
          <span>ERC20</span>
        </div>
        
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '25px',
            fontSize: '18px',
            color: '#e5e7eb',
            fontWeight: '500',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span>⚡</span>
          <span>Base Network</span>
          <span>•</span>
          <span>🎮</span>
          <span>Real-time</span>
          <span>•</span>
          <span>🏆</span>
          <span>Rewards</span>
        </div>
        
        {/* Show additional details if available */}
        {(participants || rewards || difficulty) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginTop: '20px',
              fontSize: '16px',
              color: '#d1d5db',
              fontWeight: '500',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
          >
            {participants && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>👥</span>
                <span>{participants}</span>
              </span>
            )}
            {rewards && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>💰</span>
                <span>{rewards}</span>
              </span>
            )}
            {difficulty && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🎯</span>
                <span>{difficulty}</span>
              </span>
            )}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
} 