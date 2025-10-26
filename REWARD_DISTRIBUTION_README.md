# Reward Distribution System Implementation

## Overview
This document outlines the comprehensive reward distribution system for the Snarkel quiz platform, featuring admin-controlled distribution, real-time UI updates, and participant reward tracking.

## 🚀 Features Implemented

### ✅ Phase 1: Core Backend Infrastructure

#### 1. Admin Wallet Setup
- **Environment Variable**: `ADMIN_WALLET` private key for automated distribution
- **Viem Integration**: Secure wallet client with Celo Alfajores testnet
- **Security**: Private key never exposed in client-side code

#### 2. Reward Distribution API (`/api/rewards/distribute`)
```typescript
// Request Body
{
  snarkelId: string;
  sessionId: string;
  leaderboard: Array<{
    userId: string;
    walletAddress: string;
    score: number;
    position: number;
    timeBonus: number;
    finalPoints: number;
  }>;
  rewardConfig: {
    type: 'LINEAR' | 'QUADRATIC';
    tokenAddress: string;
    totalRewardPool?: string;
    rewardAmounts?: number[];
    totalWinners?: number;
  };
}
```

#### 3. Distribution Methods
- **LINEAR**: Fixed amounts per position (1st: X tokens, 2nd: Y tokens, etc.)
- **QUADRATIC**: Distribution based on score ratios from total pool

#### 4. Real-Time Status APIs
- **GET** `/api/rewards/status/[snarkelId]` - Overall distribution status
- **GET** `/api/rewards/user/[userId]/[snarkelId]` - Personal reward details

### ✅ Phase 2: Frontend Components

#### 1. Enhanced Leaderboard Component
- **Real-time updates** with WebSocket/polling
- **Personal reward cards** for winners
- **Distribution progress** indicators
- **Transaction hash links** to blockchain explorer

#### 2. Distribution Status Display
```typescript
interface DistributionStatus {
  isDistributing: boolean;
  distributionComplete: boolean;
  distributionList: Array<{
    position: number;
    participant: string;
    walletAddress: string;
    rewardAmount: string;
    transactionHash?: string;
    status: 'pending' | 'success' | 'failed';
  }>;
  totalDistributed: string;
  failedTransactions: number;
}
```

#### 3. Custom Hook: `useRewardDistribution`
- **State management** for distribution process
- **Polling mechanism** for real-time updates
- **Error handling** and retry logic
- **Cleanup** on component unmount

## 🔧 Technical Implementation

### Backend Services

#### Reward Calculator Service
```typescript
// Linear rewards: Fixed amounts per position
function calculateLinearRewards(leaderboard, rewardAmounts) {
  return leaderboard
    .filter((entry, index) => index < rewardAmounts.length)
    .map((entry, index) => ({
      position: entry.position,
      rewardAmount: rewardAmounts[index].toString(),
      status: 'pending'
    }));
}

// Quadratic rewards: Score-based distribution
function calculateQuadraticRewards(leaderboard, totalPool) {
  const totalPoints = leaderboard.reduce((sum, entry) => sum + entry.finalPoints, 0);
  const poolAmount = parseEther(totalPool);

  return leaderboard.map(entry => {
    const share = entry.finalPoints / totalPoints;
    const rewardAmount = (poolAmount * BigInt(Math.round(share * 1000000))) / 1000000n;
    
    return {
      position: entry.position,
      rewardAmount: rewardAmount.toString(),
      status: 'pending'
    };
  });
}
```

#### Distribution Service
```typescript
async function executeBatchTransfers(walletClient, tokenContract, distributions) {
  const results = [];
  let totalDistributed = 0n;
  let failedTransactions = 0;

  for (const distribution of distributions) {
    try {
      const hash = await walletClient.writeContract({
        ...tokenContract,
        functionName: 'transfer',
        args: [
          getAddress(distribution.walletAddress),
          parseEther(distribution.rewardAmount)
        ]
      });

      const receipt = await walletClient.waitForTransactionReceipt({ hash });
      
      results.push({
        ...distribution,
        transactionHash: hash,
        status: 'success'
      });

      totalDistributed += parseEther(distribution.rewardAmount);
    } catch (error) {
      results.push({
        ...distribution,
        status: 'failed',
        error: error.message
      });
      failedTransactions++;
    }
  }

  return {
    success: failedTransactions === 0,
    distributions: results,
    totalDistributed: totalDistributed.toString(),
    failedTransactions
  };
}
```

### Frontend Components

#### Enhanced Leaderboard Features
- **Position indicators** with crown/award/trophy icons
- **Personal highlighting** for current user
- **Real-time score updates** during quiz
- **Reward distribution status** for each participant
- **Transaction hash links** to CeloScan

#### Distribution Progress Display
- **Spinning loader** during distribution
- **Success/failure indicators** for each transaction
- **Progress statistics** (successful/failed/total)
- **Estimated completion time**

## 🗄️ Database Schema

### Reward Distributions Table
```sql
CREATE TABLE reward_distributions (
  id UUID PRIMARY KEY,
  snarkel_id UUID REFERENCES snarkels(id),
  participant_id UUID REFERENCES participants(id),
  wallet_address VARCHAR(42),
  position INTEGER,
  reward_amount DECIMAL(36,18),
  transaction_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending',
  distributed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Quiz Sessions Updates
```sql
ALTER TABLE quiz_sessions ADD COLUMN rewards_distributed BOOLEAN DEFAULT FALSE;
ALTER TABLE quiz_sessions ADD COLUMN distribution_started_at TIMESTAMP;
ALTER TABLE quiz_sessions ADD COLUMN distribution_completed_at TIMESTAMP;
```

## 🔒 Security Considerations

### Admin Wallet Security
- **Environment variables** for private key storage
- **Transaction limits** and balance checks
- **Audit trail** for all admin actions
- **Multi-signature** support for large distributions

### Distribution Integrity
- **Cryptographic proof** of distribution
- **Immutable leaderboard** snapshots
- **Dispute resolution** mechanism
- **Transaction verification** on blockchain

## 🧪 Testing Requirements

### Unit Tests
- [ ] Reward calculation algorithms
- [ ] Distribution logic validation
- [ ] Error handling scenarios
- [ ] Balance checking functions

### Integration Tests
- [ ] End-to-end distribution flow
- [ ] Real blockchain transactions (testnet)
- [ ] UI state management
- [ ] WebSocket/polling mechanisms

### Load Tests
- [ ] Large participant distributions (1000+ users)
- [ ] Concurrent quiz completions
- [ ] Network resilience testing
- [ ] Database performance under load

## 📊 Success Metrics

### Performance Targets
- **Distribution completion time**: < 5 minutes for 100 participants
- **Successful transaction rate**: 99%+
- **Real-time UI updates**: Within 2 seconds
- **Zero reward calculation errors**: 100% accuracy

### User Experience Goals
- **Positive user feedback** on reward experience
- **Clear communication** of distribution status
- **Easy transaction verification** via blockchain links
- **Smooth integration** with existing quiz flow

## 🚀 Usage Examples

### Starting Distribution
```typescript
const { startDistribution } = useRewardDistribution(snarkelId);

const handleQuizEnd = async () => {
  const result = await startDistribution(
    sessionId,
    finalLeaderboard,
    {
      type: 'LINEAR',
      tokenAddress: '0x...',
      rewardAmounts: [100, 50, 25]
    }
  );
  
  if (result.success) {
    console.log('Distribution started successfully');
  }
};
```

### Monitoring Distribution Status
```typescript
const { distributionStatus, isDistributing } = useRewardDistribution(snarkelId);

useEffect(() => {
  if (distributionStatus?.distributionComplete) {
    console.log('All rewards distributed!');
    // Show success message to users
  }
}, [distributionStatus]);
```

### Displaying Personal Rewards
```typescript
const { getUserReward } = useRewardDistribution(snarkelId);

const [userReward, setUserReward] = useState(null);

useEffect(() => {
  if (isQuizEnded && rewardsEnabled) {
    getUserReward(userId).then(setUserReward);
  }
}, [isQuizEnded, rewardsEnabled]);
```

## 🔄 Next Steps

### Phase 3: Advanced Features
- [ ] **Retry mechanism** for failed transactions
- [ ] **Partial distribution** handling
- [ ] **Manual intervention** tools for admins
- [ ] **Alternative RPC endpoints** for network resilience

### Phase 4: Security Hardening
- [ ] **Multi-signature** wallet support
- [ ] **Transaction limits** and rate limiting
- [ ] **Audit logging** and monitoring
- [ ] **Dispute resolution** system

## 📝 Environment Setup

### Required Environment Variables
```bash
# Admin wallet private key (for automated distributions)
ADMIN_WALLET=0x...

# Celo Alfajores testnet configuration
NEXT_PUBLIC_CELO_CHAIN_ID=44787
NEXT_PUBLIC_CELO_RPC_URL=https://alfajores-forno.celo-testnet.org

# Database connection
DATABASE_URL=...
```

### Installation Steps
1. **Install dependencies**: `npm install viem @prisma/client`
2. **Set up environment variables** with admin wallet
3. **Deploy database schema** with reward tables
4. **Test with small distributions** on testnet
5. **Monitor and optimize** for production use

## 🎯 Conclusion

This reward distribution system provides a comprehensive solution for automated, secure, and user-friendly token distribution in the Snarkel quiz platform. The implementation follows best practices for security, performance, and user experience while maintaining flexibility for future enhancements.

The system is ready for Phase 1 deployment and can be extended with additional features based on user feedback and requirements. 