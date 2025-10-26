import { useState } from 'react';
import { useQuizContract } from './useViemContract';
import { parseEther, formatEther, type Address } from 'viem';

// Contract addresses for different networks
const getContractAddress = (chainId?: number): string => {
  if (chainId === 8453) { // Base Mainnet
    return process.env.NEXT_PUBLIC_SNARKEL_CONTRACT_ADDRESS_BASE || '0xd2c5d1cf9727da34bcb6465890e4fb5c413bbd40';
  } else if (chainId === 42220) { // Celo Mainnet
    return process.env.NEXT_PUBLIC_SNARKEL_CONTRACT_ADDRESS_CELO || '0x8b8fb708758dc8185ef31e685305c1aa0827ea65';
  } else {
    // Default to Base if no chainId specified
    return process.env.NEXT_PUBLIC_SNARKEL_CONTRACT_ADDRESS_BASE || '0xd2c5d1cf9727da34bcb6465890e4fb5c413bbd40';
  }
};

interface SnarkelData {
  title: string;
  description: string;
  basePointsPerQuestion: number;
  maxSpeedBonus: number;
  speedBonusEnabled: boolean;
  maxQuestions: number;
  isPublic: boolean;
  allowlist: string[];
  spamControlEnabled: boolean;
  entryFee: number;
  entryFeeToken: string;
  creatorAddress?: string; // Wallet address of the creator
  autoStartEnabled?: boolean;
  scheduledStartTime?: string | null;
  isFeatured?: boolean;
  featuredPriority?: number;
  rewards: {
    enabled: boolean;
    type: 'LINEAR' | 'QUADRATIC';
    tokenAddress: string;
    chainId: number;
    tokenSymbol?: string;
    tokenName?: string;
    tokenDecimals?: number;
    network?: string;
    totalWinners?: number;
    rewardAmounts?: number[];
    totalRewardPool?: string;
    minParticipants?: number;
    pointsWeight?: number;
    rewardAllParticipants?: boolean;
  };
  questions: Array<{
    id: string;
    text: string;
    timeLimit: number;
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
  }>;
}

interface ValidationErrors {
  [key: string]: string;
}

interface UseSnarkelCreationReturn {
  isSubmitting: boolean;
  error: string | null;
  validationErrors: ValidationErrors;
  setValidationErrors: (errors: ValidationErrors | ((prev: ValidationErrors) => ValidationErrors)) => void;
  createSnarkel: (data: SnarkelData, contractFunctions?: any) => Promise<{ success: boolean; snarkelCode?: string; snarkelId?: string; error?: string }>;
  clearErrors: () => void;
}

export const useSnarkelCreation = (): UseSnarkelCreationReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Contract functions will be passed as parameters to createSnarkel

  const validateForm = (data: SnarkelData): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Check wallet connection
    if (!data.creatorAddress) {
      errors.wallet = 'Wallet connection is required to create a snarkel';
    }

    // Check title
    if (!data.title.trim()) {
      errors.title = 'Snarkel title is required';
    }

    // Check questions
    if (data.questions.length === 0) {
      errors.questions = 'At least one question is required';
    } else {
      // Validate each question
      data.questions.forEach((question, index) => {
        if (!question.text.trim()) {
          errors[`question_${index}_text`] = `Question ${index + 1} text is required`;
        }
        
        // Check if question has at least 2 options
        if (question.options.length < 2) {
          errors[`question_${index}_options`] = `Question ${index + 1} needs at least 2 options`;
        }
        
        // Check if at least one option is marked as correct
        const hasCorrectOption = question.options.some(opt => opt.isCorrect);
        if (!hasCorrectOption) {
          errors[`question_${index}_correct`] = `Question ${index + 1} needs at least one correct answer`;
        }
        
        // Check if all options have text
        question.options.forEach((option, optIndex) => {
          if (!option.text.trim()) {
            errors[`question_${index}_option_${optIndex}`] = `Question ${index + 1} option ${optIndex + 1} is required`;
          }
        });
      });
    }

    // Check rewards if enabled
    if (data.rewards.enabled) {
      if (!data.rewards.tokenAddress.trim()) {
        errors.rewardsToken = 'Reward token address is required when rewards are enabled';
      }
      
      if (data.rewards.type === 'LINEAR') {
        if (!data.rewards.totalWinners || data.rewards.totalWinners < 1) {
          errors.rewardsWinners = 'Total winners must be at least 1';
        }
        if (!data.rewards.rewardAmounts || data.rewards.rewardAmounts.length === 0) {
          errors.rewardsAmounts = 'Reward amounts are required';
        }
      }
      
      if (data.rewards.type === 'QUADRATIC') {
        if (!data.rewards.totalRewardPool || data.rewards.totalRewardPool === '0') {
          errors.rewardsPool = 'Total reward pool is required';
        }
        if (!data.rewards.minParticipants || data.rewards.minParticipants < 1) {
          errors.rewardsParticipants = 'Minimum participants must be at least 1';
        }
      }
    }

    // Check spam control if enabled
    if (data.spamControlEnabled) {
      if (!data.entryFee || data.entryFee <= 0) {
        errors.entryFee = 'Entry fee must be greater than 0';
      }
      if (!data.entryFeeToken.trim()) {
        errors.entryFeeToken = 'Entry fee token address is required';
      }
    }

    return errors;
  };

  const createSnarkel = async (data: SnarkelData, contractFunctions?: any): Promise<{ success: boolean; snarkelCode?: string; snarkelId?: string; error?: string }> => {
    // Clear previous errors
    setError(null);
    setValidationErrors({});
    
    // Add comprehensive debugging
    console.log('=== CREATE SNARKEL DEBUG START ===');
    console.log('Input data:', JSON.stringify(data, null, 2));
    console.log('Rewards enabled:', data.rewards.enabled);
    console.log('Chain ID:', data.rewards.chainId);
    console.log('Token address:', data.rewards.tokenAddress);
    console.log('Reward type:', data.rewards.type);
    console.log('Creator address:', data.creatorAddress);
    
    // Validate form first
    const errors = validateForm(data);
    if (Object.keys(errors).length > 0) {
      console.log('Validation errors:', errors);
      setError('Please fix the validation errors before creating your snarkel.');
      setValidationErrors(errors);
      return { success: false, error: 'Validation failed' };
    }
    
    setIsSubmitting(true);
    
    // Add overall timeout for the entire operation
    const overallTimeout = setTimeout(() => {
      console.error('Overall timeout reached for createSnarkel');
      setIsSubmitting(false);
    }, 300000); // 5 minutes timeout
    
    try {
      let snarkelCode: string | undefined;
      let onchainSessionId: string | undefined;

      // Step 1: Create quiz in database first to get the quiz code
      console.log('=== STEP 1: Creating quiz in database ===');
      const response = await fetch('/api/snarkel/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          creatorAddress: data.creatorAddress,
          startTime: data.scheduledStartTime || undefined,
          autoStartEnabled: data.autoStartEnabled || false,
          entryFee: data.entryFee || 0 // Ensure entry fee is set to zero if not provided
        }),
      });

      const responseData = await response.json();
      console.log('Database response status:', response.status);
      console.log('Database response data:', responseData);

      if (!response.ok) {
        const errorMessage = responseData.error || 'Failed to create snarkel';
        console.error('Database creation failed:', errorMessage);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      snarkelCode = responseData.snarkelCode;
      console.log('Quiz created in database, snarkelCode:', snarkelCode);

      // Step 2: If rewards are enabled, create smart contract session with the actual quiz code
      if (data.rewards.enabled && snarkelCode) {
        console.log('=== STEP 2: Rewards enabled, starting blockchain operations ===');
        console.log('Network: Base (Chain ID:', data.rewards.chainId, ')');
        
        try {
          // Validate token first
          console.log('=== Token validation ===');
          const tokenResponse = await fetch('/api/token/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenAddress: data.rewards.tokenAddress,
              chainId: data.rewards.chainId,
            }),
          });

          console.log('Token validation response status:', tokenResponse.status);
          if (!tokenResponse.ok) {
            const tokenError = await tokenResponse.json();
            console.error('Token validation failed:', tokenError);
            throw new Error(`Token validation failed: ${tokenError.error || 'Unknown error'}`);
          }

          const tokenData = await tokenResponse.json();
          console.log('Token validation result:', tokenData);
          if (!tokenData.isValid) {
            throw new Error(tokenData.error || 'Invalid token address');
          }

          // Calculate entry fee from spam control settings
          let entryFeeWei = '0';
          
          if (data.spamControlEnabled && data.entryFee > 0) {
            // Convert entry fee to wei (assuming entry fee is in the token's smallest unit)
            entryFeeWei = (data.entryFee * 1e18).toString();
          }

          console.log('=== Session creation parameters ===');
          console.log('Entry fee wei:', entryFeeWei);
          console.log('Platform fee percentage: 5%');
          console.log('Max participants: 100');

          // Calculate required amount for rewards if enabled
          let requiredAmount = '0';
          if (data.rewards.enabled) {
            console.log('=== REWARD CALCULATION DEBUG ===');
            console.log('Reward type:', data.rewards.type);
            console.log('Total reward pool (raw):', data.rewards.totalRewardPool);
            console.log('Total reward pool type:', typeof data.rewards.totalRewardPool);
            
            if (data.rewards.type === 'LINEAR') {
              const totalReward = data.rewards.rewardAmounts?.reduce((sum, amount) => sum + amount, 0) || 0;
              requiredAmount = parseEther(totalReward.toString()).toString();
              console.log('LINEAR rewards - Total reward:', totalReward, 'Required amount (wei):', requiredAmount);
            } else if (data.rewards.type === 'QUADRATIC') {
              requiredAmount = data.rewards.totalRewardPool 
                ? parseEther(data.rewards.totalRewardPool).toString()
                : '0';
              console.log('QUADRATIC rewards - Total reward pool:', data.rewards.totalRewardPool, 'Required amount (wei):', requiredAmount);
            }
            
            console.log('Final required amount (wei):', requiredAmount);
            console.log('Final required amount (tokens):', formatEther(BigInt(requiredAmount)));
          }

          console.log('=== Contract interaction setup ===');
          // Contract functions should be passed as parameters to this function
          if (!contractFunctions) {
            throw new Error('Contract functions are required for blockchain operations');
          }
          
          const { createSnarkelSession, approveToken, transferToken, getTokenBalance, getTokenAllowance, contractState } = contractFunctions;
          
          console.log('Contract state:', contractState);
          console.log('Contract functions available:', {
            createSnarkelSession: !!createSnarkelSession,
            approveToken: !!approveToken,
            transferToken: !!transferToken,
            getTokenBalance: !!getTokenBalance,
            getTokenAllowance: !!getTokenAllowance
          });

          // Create smart contract session with the actual quiz code - Using Wagmi
          console.log('=== Creating smart contract session ===');
          const sessionResult = await createSnarkelSession({
            snarkelCode, // Use the actual quiz code from database
            entryFeeWei, // entryFee in wei
            platformFeePercentage: 5, // 5%
            maxParticipants: 100,
            expectedRewardToken: data.rewards.enabled ? (data.rewards.tokenAddress as Address) : '0x0000000000000000000000000000000000000000' as Address, // NEW: Required reward token
            expectedRewardAmount: requiredAmount // NEW: Required reward amount
          });

          console.log('Session creation result:', sessionResult);
          if (!sessionResult.success) {
            throw new Error(sessionResult.error || 'Failed to create session');
          }

          console.log('Session created successfully, transaction hash:', sessionResult.transactionHash);

          // Step 3: Handle ERC20 token operations if rewards are enabled
          if (data.rewards.enabled && sessionResult.transactionHash) {
            console.log('=== STEP 3: Handling ERC20 token operations ===');
            
            // Check current allowance first
            console.log('=== Checking current token allowance ===');
            const currentAllowance = await getTokenAllowance(
              data.rewards.tokenAddress as any,
              data.creatorAddress as any,
              getContractAddress(data.rewards.chainId) as any
            );
            
            console.log('Current allowance:', currentAllowance);
            console.log('Required amount:', requiredAmount);
            
            // Only approve if current allowance is insufficient
            if (parseFloat(currentAllowance) < parseFloat(requiredAmount)) {
              console.log('=== Current allowance insufficient, approving tokens ===');
              const approveResult = await approveToken({
                tokenAddress: data.rewards.tokenAddress as any,
                spenderAddress: getContractAddress(data.rewards.chainId) as any,
                amount: requiredAmount
              });

              console.log('Approve result:', approveResult);
              if (!approveResult.success) {
                console.warn('Token approval failed, but continuing with session creation');
                console.warn('User will need to approve tokens manually before participating');
                
                // Set a warning message for the user
                setError(`⚠️ Token approval failed. Your quiz was created successfully, but you'll need to approve ${data.rewards.tokenSymbol} tokens manually before participants can join.`);
                
                // Don't throw error - continue with session creation
              } else {
                console.log('Token approval successful, transaction hash:', approveResult.transactionHash);
                
                // Wait for approval to be processed
                console.log('Waiting for approval to be processed...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Verify approval was successful
                const newAllowance = await getTokenAllowance(
                  data.rewards.tokenAddress as any,
                  data.creatorAddress as any,
                  getContractAddress(data.rewards.chainId) as any
                );
                
                if (parseFloat(newAllowance) >= parseFloat(requiredAmount)) {
                  console.log('Approval verified successfully, new allowance:', newAllowance);
                  
                  // Transfer tokens to contract
                  console.log('=== Transferring tokens to contract ===');
                  const transferResult = await transferToken({
                    tokenAddress: data.rewards.tokenAddress as any,
                    toAddress: getContractAddress(data.rewards.chainId) as any,
                    amount: requiredAmount
                  });

                  console.log('Transfer result:', transferResult);
                  if (!transferResult.success) {
                    console.warn('Token transfer failed, but session was created');
                    console.warn('User will need to transfer tokens manually');
                    setError(`⚠️ Token transfer failed. Your quiz was created successfully, but you'll need to transfer ${data.rewards.tokenSymbol} tokens manually to the contract.`);
                  } else {
                    console.log('Token transfer successful, transaction hash:', transferResult.transactionHash);
                    // Clear any previous errors and show success
                    setError(null);
                  }
                } else {
                  console.warn('Approval verification failed, new allowance:', newAllowance);
                  console.warn('User will need to approve and transfer tokens manually');
                  setError(`⚠️ Token approval verification failed. Your quiz was created successfully, but you'll need to approve and transfer ${data.rewards.tokenSymbol} tokens manually.`);
                }
              }
            } else {
              console.log('=== Sufficient allowance already exists, transferring tokens ===');
              const transferResult = await transferToken({
                tokenAddress: data.rewards.tokenAddress as any,
                toAddress: getContractAddress(data.rewards.chainId) as any,
                amount: requiredAmount
              });

              console.log('Transfer result:', transferResult);
              if (!transferResult.success) {
                console.warn('Token transfer failed, but session was created');
                console.warn('User will need to transfer tokens manually');
                setError(`⚠️ Token transfer failed. Your quiz was created successfully, but you'll need to transfer ${data.rewards.tokenSymbol} tokens manually to the contract.`);
              } else {
                console.log('Token transfer successful, transaction hash:', transferResult.transactionHash);
                // Clear any previous errors and show success
                setError(null);
              }
            }
          }

          // Get the actual session ID from the contract response
          // We need to read the session ID from the blockchain
          onchainSessionId = sessionResult.transactionHash; // Using transaction hash as session ID for now

          // Step 4: Update database with reward configuration and onchain session ID
          console.log('=== STEP 4: Updating database with reward config ===');
          const updateResponse = await fetch('/api/snarkel/update-rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              snarkelId: responseData.snarkel.id,
              rewardConfig: data.rewards,
              onchainSessionId: onchainSessionId,
              transactionHash: sessionResult.transactionHash,
            }),
          });

          console.log('Update rewards response status:', updateResponse.status);
          if (!updateResponse.ok) {
            const updateError = await updateResponse.json();
            console.error('Failed to update reward configuration:', updateError);
            throw new Error(`Failed to update reward configuration: ${updateError.error || 'Unknown error'}`);
          }

          console.log('Database updated with reward configuration successfully');

        } catch (blockchainError: any) {
          console.error('=== BLOCKCHAIN OPERATION FAILED ===');
          console.error('Error details:', blockchainError);
          console.error('Error message:', blockchainError.message);
          console.error('Error stack:', blockchainError.stack);
          
          // Check if it's a rate limiting error
          let userFriendlyError = blockchainError.message;
          if (blockchainError.message?.includes('over rate limit') || blockchainError.message?.includes('429')) {
            userFriendlyError = 'RPC rate limit exceeded - please try again in a few minutes';
          } else if (blockchainError.message?.includes('Insufficient token balance')) {
            userFriendlyError = 'Insufficient token balance - please check your wallet';
          } else if (blockchainError.message?.includes('Token approval failed')) {
            userFriendlyError = 'Token approval failed - please try again';
          } else if (blockchainError.message?.includes('Token transfer failed')) {
            userFriendlyError = 'Token transfer failed - please try again';
          }
          
          // Try to update the database to mark the snarkel as having failed blockchain setup
          try {
            console.log('Attempting to mark blockchain setup as failed in database...');
            await fetch('/api/snarkel/mark-blockchain-failed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                snarkelId: responseData.snarkel.id,
                error: userFriendlyError
              }),
            });
            console.log('Database updated with blockchain failure status');
          } catch (updateError) {
            console.error('Failed to update database with blockchain error:', updateError);
          }

          // Return partial success - quiz created but rewards failed
          return { 
            success: true, 
            snarkelCode,
            snarkelId: responseData.snarkel.id,
            error: `Quiz created successfully, but reward setup failed: ${userFriendlyError}. You can try setting up rewards later.`
          };
        }
      }

      setError(null);
      console.log('=== CREATE SNARKEL DEBUG END: SUCCESS ===');
      return { 
        success: true, 
        snarkelCode,
        snarkelId: responseData.snarkel.id
      };

    } catch (error: any) {
      console.error('=== CREATE SNARKEL DEBUG END: ERROR ===');
      console.error('Error creating snarkel:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      const errorMessage = error.message || 'Network error: Failed to create snarkel. Please check your connection and try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      clearTimeout(overallTimeout);
      setIsSubmitting(false);
    }
  };

  const clearErrors = () => {
    setError(null);
    setValidationErrors({});
  };

  return {
    isSubmitting,
    error,
    validationErrors,
    setValidationErrors,
    createSnarkel,
    clearErrors,
  };
};