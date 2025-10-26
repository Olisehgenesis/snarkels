# Enhanced Quiz Reward System Implementation

## Overview

This implementation adds a comprehensive reward system to the Snarkel quiz platform, allowing creators to configure optional rewards for their quizzes. The system supports both linear (fixed amounts) and quadratic (proportional) reward distributions with real-time token validation and smart contract integration.

## Core Features

### 🎯 Reward Configuration
- **Optional Rewards**: Creators can enable/disable rewards for any quiz
- **Token Selection**: Support for ERC-20 tokens with real-time validation
- **Token Presets**: Quick selection of popular tokens (USDC, cUSD, CELO)
- **Network Support**: Celo Mainnet and Alfajores testnet
- **Distribution Types**: Linear (fixed amounts) and Quadratic (proportional)
- **Smart Defaults**: Pre-configured reward amounts for different winner counts
- **Custom Amounts**: Add/remove individual reward amounts with real-time total calculation

### 🔗 Smart Contract Integration
- **Complete Blockchain Flow**: Quiz creation + smart contract session when rewards enabled
- **Progressive Creation Flow**: Multi-step process with real-time feedback
- **Onchain Session Management**: Smart contract session creation and management
- **Database Synchronization**: Automatic database updates with onchain references
- **Fallback Handling**: Quiz creation succeeds even if blockchain operations fail

### 🛡️ Token Validation
- **Real Blockchain Validation**: Queries actual ERC-20 contracts on Celo networks
- **Real-time Validation**: Instant token address validation as users type
- **Token Details Display**: Shows token name, symbol, and decimals from blockchain
- **Multi-network Support**: Validates tokens on Celo Mainnet and Alfajores testnet
- **Error Handling**: Graceful handling of invalid addresses and network issues

## Technical Implementation

### Database Schema Updates

#### Snarkel Model
```prisma
model Snarkel {
  // ... existing fields
  rewardsEnabled        Boolean            @default(false)
  onchainSessionId      String?
  // ... rest of fields
}
```

#### SnarkelReward Model
```prisma
model SnarkelReward {
  // ... existing fields
  chainId         Int                  @default(42220)
  onchainSessionId String?
  // ... rest of fields
}
```

### Components

#### 1. RewardConfigurationSection
Main component for reward setup with:
- Reward toggle switch
- Network selection (Celo/Alfajores)
- Token address input with validation
- Distribution type selection
- Configuration forms for linear/quadratic rewards

#### 2. TokenSelector
Real-time token validation component with:
- Debounced input validation
- Token details display
- Error state handling
- Loading states

#### 3. ChainSelector
Network selection component supporting:
- Celo Mainnet (42220)
- Celo Alfajores (44787)
- Visual network indicators

#### 4. ProgressModal
Multi-step creation process with:
- Progress tracking
- Step-by-step feedback
- Error handling and retry options
- Success/error states

### Hooks

#### 1. useTokenDetails
```typescript
const { tokenDetails, validateToken, clearTokenDetails } = useTokenDetails();
```
- Real-time token validation
- Token information fetching
- Error state management

#### 2. useRewardCreation
```typescript
const { steps, currentStep, isCreating, createRewardSession } = useRewardCreation();
```
- Progressive creation flow management
- Smart contract integration
- Step tracking and error handling

### API Endpoints

#### 1. Token Validation
`POST /api/token/validate`
```typescript
{
  tokenAddress: string;
  chainId: number;
}
```
**Response:**
```typescript
{
  isValid: boolean;
  name?: string;      // Token name from blockchain
  symbol?: string;    // Token symbol from blockchain
  decimals?: number;  // Token decimals from blockchain
  error?: string;     // Error message if validation fails
}
```

#### 2. Reward Update
`POST /api/snarkel/update-rewards`
```typescript
{
  snarkelId: string;
  rewardConfig: RewardConfig;
  onchainSessionId?: string;
}
```

## User Experience Flow

### 1. Wallet Connection
1. User must connect wallet first
2. Wallet connection is required before any quiz creation
3. Secure authentication for quiz management

### 2. Quiz Creation
1. User creates quiz with basic details
2. Navigates to rewards tab
3. Toggles rewards on/off

### 3. Reward Configuration (if enabled)
1. **Network Selection**: Choose Celo Mainnet or Alfajores
2. **Token Selection**: Use presets (USDC, cUSD, CELO) or enter custom address
3. **Distribution Type**: Select Linear or Quadratic
4. **Linear Configuration**: 
   - Choose number of winners (1-5)
   - Set individual reward amounts
   - Real-time total calculation
5. **Quadratic Configuration**: Set total pool and parameters

### 4. Complete Creation Flow
1. **Step 1**: Create quiz in database
2. **Step 2**: If rewards enabled:
   - Validate token address on blockchain
   - Calculate total reward amounts
   - Deploy smart contract session with proper parameters
   - Update database with onchain reference
3. **Step 3**: Handle success/failure with user feedback

### 4. Error Handling
- Invalid token addresses
- Network connectivity issues
- Transaction failures
- Database update failures
- Rollback mechanisms for partial failures

## Configuration Options

### Linear Rewards
- **Winner Selection**: Choose 1-5 winners with visual buttons
- **Smart Defaults**: Pre-configured reward distributions (60/40, 50/30/20, etc.)
- **Custom Amounts**: Add/remove individual amounts with real-time total
- **Token Presets**: Quick selection of USDC, cUSD, CELO
- **Real-time Validation**: Blockchain token validation

### Quadratic Rewards
- **Total Reward Pool**: Total amount to distribute
- **Min Participants**: Minimum participants required
- **Points Weight**: Weight factor for points vs. participation (0-1)

## Smart Contract Integration

### useSnarkelContract Hook
The system integrates with the existing `useSnarkelContract` hook for:
- Session creation
- Reward distribution
- Transaction management
- State synchronization

### Contract Functions Used
- `createSnarkelSession`: Creates new reward session
- `distributeRewards`: Distributes rewards to winners
- `claimReward`: Allows participants to claim rewards

## Error Handling

### Validation Errors
- Invalid token addresses
- Missing required fields
- Invalid reward amounts
- Network connectivity issues

### Transaction Errors
- Smart contract deployment failures
- Gas estimation issues
- Network congestion
- Insufficient funds

### Database Errors
- Connection issues
- Constraint violations
- Rollback scenarios

## Future Enhancements

### Planned Features
1. **Multi-chain Support**: Expand beyond Celo to other networks
2. **Advanced Token Validation**: Additional token metadata and balance checks
3. **Reward Analytics**: Detailed reward distribution tracking
4. **Batch Operations**: Support for multiple reward types
5. **Automated Testing**: Comprehensive test coverage

### Scalability Considerations
- Database indexing for reward queries
- Caching for token validation
- Rate limiting for API endpoints
- Optimistic updates for better UX

## Development Notes

### Environment Setup
```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Testing
```bash
# Run tests
npm test

# Run specific test files
npm test -- --testNamePattern="reward"
```

### Deployment
```bash
# Build for production
npm run build

# Deploy to production
npm run deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 