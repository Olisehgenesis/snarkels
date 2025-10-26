// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SnarkelContract
 * @dev A smart contract for managing quiz sessions with crypto rewards
 * @dev Includes circuit breaker functionality for emergency stops
 * @dev Circuit breaker can be opened by owner to prevent all critical operations
 * @dev Circuit breaker can be closed by owner to resume normal operations
 */
contract SnarkelContract is Ownable, ReentrancyGuard {

    /**
     * @dev Circuit breaker state - when true, prevents all critical operations
     * @dev Can only be controlled by the contract owner
     */
    bool public circuitBreakerOpen;

    // Events for circuit breaker
    event CircuitBreakerOpened(address indexed by);
    event CircuitBreakerClosed(address indexed by);

    // Structs
    struct SnarkelSession {
        uint256 sessionId;
        string snarkelCode;
        uint256 entryFee;
        uint256 platformFeePercentage;
        uint256 maxParticipants;
        uint256 currentParticipants;
        bool isActive;
        uint256 createdAt;
        address[] participants;
        address expectedRewardToken;
        uint256 expectedRewardAmount;
        mapping(address => bool) isParticipant;
        mapping(address => bool) hasClaimedReward;
    }

    struct Reward {
        address tokenAddress;
        uint256 amount;
        bool isDistributed;
    }

    struct SnarkelFee {
        uint256 feeAmount;
        address tokenAddress;
        bool isActive;
    }

    // State variables
    uint256 private _sessionIds;
    uint256 private _snarkelIds;

    mapping(uint256 => SnarkelSession) public snarkelSessions;
    mapping(uint256 => Reward[]) public sessionRewards;
    // Per-session per-user claimable rewards set after a quiz ends
    mapping(uint256 => mapping(address => uint256)) public sessionClaimableRewards;
    // Per-session per-user wins counter
    mapping(uint256 => mapping(address => uint256)) public sessionWinsCount;
    // Whether rewards for a session have been finalized (winners/amounts set)
    mapping(uint256 => bool) public sessionRewardsFinalized;
    mapping(uint256 => SnarkelFee) public snarkelFees;
    mapping(address => bool) public adminWallets;
    mapping(address => bool) public verifiedUsers;
    mapping(string => uint256) public snarkelCodeToSessionId;
    mapping(string => bool) public snarkelCodeRewardsDistributed;

    // Super admin functionality
    mapping(address => bool) public superAdmins;
    mapping(uint256 => address) public sessionCreator; // Track who created each session
    mapping(uint256 => bool) public sessionBanned; // Track banned sessions

    // Events
    event SnarkelSessionCreated(uint256 indexed sessionId, string snarkelCode, uint256 entryFee);
    event ParticipantJoined(uint256 indexed sessionId, address indexed participant);
    event ParticipantAdded(uint256 indexed sessionId, address indexed participant, address indexed admin);
    event RewardAdded(uint256 indexed sessionId, address indexed token, uint256 amount);
    event RewardClaimed(uint256 indexed sessionId, address indexed participant, address indexed token, uint256 amount);
    event RewardDistributed(uint256 indexed sessionId, address indexed token, uint256 totalAmount);
    event AdminRewardDistributed(uint256 indexed sessionId, address indexed recipient, address indexed token, uint256 amount, address admin);
    event SessionRewardsFinalized(uint256 indexed sessionId, address indexed token, uint256 totalAmount, uint256 winnersCount);
    event UserRewardSet(uint256 indexed sessionId, address indexed user, uint256 amount);
    event UserWinRecorded(uint256 indexed sessionId, address indexed user, uint256 newWinsCount);
    event SnarkelFeeUpdated(uint256 indexed snarkelId, uint256 feeAmount, address tokenAddress);
    event UserVerified(address indexed user, address indexed admin);
    event AdminWalletAdded(address indexed admin);
    event AdminWalletRemoved(address indexed admin);
    event SnarkelRewardsAlreadyDistributed(string snarkelCode, address indexed admin);

    // New events for super admin and fallback functionality
    event SuperAdminAdded(address indexed superAdmin);
    event SuperAdminRemoved(address indexed superAdmin);
    event SessionBanned(uint256 indexed sessionId, address indexed by);
    event SessionUnbanned(uint256 indexed sessionId, address indexed by);
    event FallbackRewardsDistributed(uint256 indexed sessionId, address indexed token, uint256 totalAmount, uint256 recipientsCount);
    event PartialDistributionFailureHandled(uint256 indexed sessionId, address indexed token, uint256 totalFailedAmount);
    event EmergencyRewardsRecovered(uint256 indexed sessionId, address indexed token, uint256 amount, address indexed recipient);

    // Modifiers
    modifier onlyAdmin() {
        require(adminWallets[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier onlySuperAdmin() {
        require(superAdmins[msg.sender], "Not a super admin");
        _;
    }

    modifier sessionExists(uint256 sessionId) {
        require(snarkelSessions[sessionId].sessionId != 0, "Session does not exist");
        _;
    }

    modifier sessionActive(uint256 sessionId) {
        require(snarkelSessions[sessionId].isActive, "Session not active");
        _;
    }

    /**
     * @dev Circuit breaker modifier - prevents execution when circuit breaker is open
     * @dev Applied to all critical functions that modify state or handle funds
     */
    modifier circuitBreakerClosed() {
        require(!circuitBreakerOpen, "Execution prevented because the circuit breaker is open");
        _;
    }

    // Constructor - FIXED: Single constructor with optional parameter
    // If no address is provided or address(0) is passed, msg.sender becomes the owner
    constructor() Ownable(msg.sender) {
        adminWallets[msg.sender] = true;
        superAdmins[msg.sender] = true; // Owner is also a super admin
        emit AdminWalletAdded(msg.sender);
    }

    /**
     * @dev Circuit breaker control functions
     * @dev These functions allow the owner to control the circuit breaker state
     */

    /**
     * @dev Open the circuit breaker to prevent all critical operations
     * @dev Only callable by the contract owner
     * @dev Use this in emergency situations to stop all contract activity
     */
    function openCircuitBreaker() external onlyOwner {
        circuitBreakerOpen = true;
        emit CircuitBreakerOpened(msg.sender);
    }

    /**
     * @dev Close the circuit breaker to resume normal operations
     * @dev Only callable by the contract owner
     * @dev Use this after resolving the emergency situation
     */
    function closeCircuitBreaker() external onlyOwner {
        circuitBreakerOpen = false;
        emit CircuitBreakerClosed(msg.sender);
    }

    /**
     * @dev Check if the circuit breaker is open
     * @return bool True if circuit breaker is open, false otherwise
     */
    function isCircuitBreakerOpen() external view returns (bool) {
        return circuitBreakerOpen;
    }

    // Core functions

    /**
     * @dev Create a new snarkel session
     * @param snarkelCode Unique identifier for the snarkel
     * @param entryFee Fee required to join (in native token)
     * @param platformFeePercentage Platform fee percentage (basis points)
     * @param maxParticipants Maximum number of participants
     * @param expectedRewardToken The ERC20 token address that will be distributed as rewards
     * @param expectedRewardAmount The total amount of reward tokens for this session
     */
    function createSnarkelSession(
        string memory snarkelCode,
        uint256 entryFee,
        uint256 platformFeePercentage,
        uint256 maxParticipants,
        address expectedRewardToken,
        uint256 expectedRewardAmount
    ) external circuitBreakerClosed returns (uint256) {
        require(bytes(snarkelCode).length > 0, "Snarkel code cannot be empty");
        // Allow reusing the same snarkel code only after the previous session has ended
        uint256 previousSessionId = snarkelCodeToSessionId[snarkelCode];
        if (previousSessionId != 0) {
            require(!snarkelSessions[previousSessionId].isActive, "Previous session still active");
        }
        require(platformFeePercentage <= 1000, "Platform fee cannot exceed 10%");
        require(expectedRewardToken != address(0), "Invalid reward token address");
        require(expectedRewardAmount > 0, "Reward amount must be greater than 0");

        _sessionIds++;
        uint256 sessionId = _sessionIds;

        SnarkelSession storage session = snarkelSessions[sessionId];
        session.sessionId = sessionId;
        session.snarkelCode = snarkelCode;
        session.entryFee = entryFee;
        session.platformFeePercentage = platformFeePercentage;
        session.maxParticipants = maxParticipants;
        session.isActive = true;
        session.createdAt = block.timestamp;
        session.expectedRewardToken = expectedRewardToken;
        session.expectedRewardAmount = expectedRewardAmount;

        snarkelCodeToSessionId[snarkelCode] = sessionId;
        sessionCreator[sessionId] = msg.sender; // Track session creator

        emit SnarkelSessionCreated(sessionId, snarkelCode, entryFee);
        return sessionId;
    }

    /**
     * @dev Join a snarkel session by paying the entry fee
     * @param sessionId ID of the session to join
     */
    function joinSnarkel(uint256 sessionId) 
        external 
        payable 
        nonReentrant 
        circuitBreakerClosed
        sessionExists(sessionId) 
        sessionActive(sessionId) 
    {
        SnarkelSession storage session = snarkelSessions[sessionId];
        
        require(msg.value >= session.entryFee, "Insufficient entry fee");
        require(session.currentParticipants < session.maxParticipants, "Session is full");
        require(!session.isParticipant[msg.sender], "Already a participant");

        session.participants.push(msg.sender);
        session.isParticipant[msg.sender] = true;
        session.currentParticipants++;

        emit ParticipantJoined(sessionId, msg.sender);
    }

    /**
     * @dev Add a participant to a session (admin only)
     * @param sessionId ID of the session
     * @param participant Address of the participant to add
     */
    function addParticipant(uint256 sessionId, address participant) 
        external 
        onlyAdmin 
        circuitBreakerClosed
        sessionExists(sessionId) 
        sessionActive(sessionId) 
    {
        SnarkelSession storage session = snarkelSessions[sessionId];
        
        require(participant != address(0), "Invalid participant address");
        require(session.currentParticipants < session.maxParticipants, "Session is full");
        require(!session.isParticipant[participant], "Already a participant");

        session.participants.push(participant);
        session.isParticipant[participant] = true;
        session.currentParticipants++;

        emit ParticipantAdded(sessionId, participant, msg.sender);
    }

    /**
     * @dev Add reward tokens to a session
     * @param sessionId ID of the session
     * @param tokenAddress Address of the ERC20 token
     * @param amount Amount of tokens to add
     */
    function addReward(uint256 sessionId, address tokenAddress, uint256 amount) 
        external 
        onlyAdmin 
        circuitBreakerClosed
        sessionExists(sessionId) 
        sessionActive(sessionId) 
    {
        SnarkelSession storage session = snarkelSessions[sessionId];
        
        // SECURITY: Enforce that only the expected reward token can be added
        require(tokenAddress == session.expectedRewardToken, "Token address does not match expected reward token");
        require(amount == session.expectedRewardAmount, "Amount does not match expected reward amount");
        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        
        // Check that rewards haven't already been added for this session
        require(sessionRewards[sessionId].length == 0, "Rewards already added for this session");

        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        sessionRewards[sessionId].push(Reward({
            tokenAddress: tokenAddress,
            amount: amount,
            isDistributed: false
        }));

        emit RewardAdded(sessionId, tokenAddress, amount);
    }

    /**
     * @dev Claim reward for a participant
     * @param sessionId ID of the session
     * @param tokenAddress Address of the token to claim
     */
    function claimReward(uint256 sessionId, address tokenAddress) 
        external 
        nonReentrant 
        circuitBreakerClosed
        sessionExists(sessionId) 
    {
        require(!sessionRewardsFinalized[sessionId], "Finalized: use claims");
        SnarkelSession storage session = snarkelSessions[sessionId];
        
        require(session.isParticipant[msg.sender] || verifiedUsers[msg.sender], "Not eligible for reward");
        require(!session.hasClaimedReward[msg.sender], "Already claimed reward");

        // Find the reward
        Reward[] storage rewards = sessionRewards[sessionId];
        uint256 rewardIndex = type(uint256).max;
        
        for (uint256 i = 0; i < rewards.length; i++) {
            if (rewards[i].tokenAddress == tokenAddress && !rewards[i].isDistributed) {
                rewardIndex = i;
                break;
            }
        }
        
        require(rewardIndex != type(uint256).max, "Reward not found");

        uint256 claimAmount = rewards[rewardIndex].amount / session.currentParticipants;
        require(claimAmount > 0, "No reward to claim");

        session.hasClaimedReward[msg.sender] = true;
        rewards[rewardIndex].isDistributed = true;

        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(msg.sender, claimAmount), "Token transfer failed");

        emit RewardClaimed(sessionId, msg.sender, tokenAddress, claimAmount);
    }

    /**
     * @dev Distribute rewards automatically to all participants
     * @param sessionId ID of the session
     * @param tokenAddress Address of the token to distribute
     */
    function distributeRewards(uint256 sessionId, address tokenAddress) 
        external 
        onlyAdmin 
        circuitBreakerClosed
        sessionExists(sessionId) 
        sessionActive(sessionId) 
    {
        require(!sessionRewardsFinalized[sessionId], "Finalized: use claims");
        SnarkelSession storage session = snarkelSessions[sessionId];
        Reward[] storage rewards = sessionRewards[sessionId];
        
        uint256 rewardIndex = type(uint256).max;
        for (uint256 i = 0; i < rewards.length; i++) {
            if (rewards[i].tokenAddress == tokenAddress && !rewards[i].isDistributed) {
                rewardIndex = i;
                break;
            }
        }
        
        require(rewardIndex != type(uint256).max, "Reward not found");

        uint256 totalAmount = rewards[rewardIndex].amount;
        uint256 perParticipant = totalAmount / session.currentParticipants;
        
        require(perParticipant > 0, "No reward to distribute");

        IERC20 token = IERC20(tokenAddress);
        
        for (uint256 i = 0; i < session.participants.length; i++) {
            address participant = session.participants[i];
            if (!session.hasClaimedReward[participant]) {
                session.hasClaimedReward[participant] = true;
                require(token.transfer(participant, perParticipant), "Token transfer failed");
                emit RewardClaimed(sessionId, participant, tokenAddress, perParticipant);
            }
        }

        rewards[rewardIndex].isDistributed = true;
        emit RewardDistributed(sessionId, tokenAddress, totalAmount);
    }

    /**
     * @dev Admin distribute snarkel session rewards to specific wallet
     * @param sessionId ID of the session
     * @param recipient Wallet address to receive rewards
     * @param amount Amount to distribute
     */
    function adminDistributeReward(
        uint256 sessionId, 
        address recipient, 
        uint256 amount
    ) external onlyAdmin sessionExists(sessionId) nonReentrant {
        require(!sessionRewardsFinalized[sessionId], "Finalized: use claims");
        // Get session details
        SnarkelSession storage session = snarkelSessions[sessionId];
        
        // Validate inputs
        if (recipient == address(0)) {
            revert("Invalid recipient address");
        }
        
        if (amount == 0) {
            revert("Amount must be greater than 0");
        }
        
        // Find the reward token for this session
        Reward[] storage rewards = sessionRewards[sessionId];
        if (rewards.length == 0) {
            revert("No rewards available for this session");
        }
        
        // SECURITY: Verify the reward token matches expected token and use only expected token
        address rewardTokenAddress = session.expectedRewardToken;
        require(rewards[0].tokenAddress == rewardTokenAddress, "Reward token mismatch with expected token");
        
        uint256 availableReward = rewards[0].amount;
        
        if (amount > availableReward) {
            revert("Insufficient reward balance");
        }
        
        // Transfer the reward token
        IERC20 token = IERC20(rewardTokenAddress);
        bool transferSuccess = token.transfer(recipient, amount);
        if (!transferSuccess) {
            revert("Token transfer failed");
        }

        // Update the reward amount
        rewards[0].amount = availableReward - amount;
        if (rewards[0].amount == 0) {
            rewards[0].isDistributed = true;
        }
        
        emit AdminRewardDistributed(sessionId, recipient, rewardTokenAddress, amount, msg.sender);
    }

    /**
     * @dev Finalize a session by setting per-user claimable rewards. Distribution is optional; users may claim later.
     *      Requirements:
     *        - Session must exist and be inactive (ended)
     *        - Rewards for the session must have been added and token must match expected
     *        - Sum of amounts must be <= available reward pool
     *      Note: Passing the same user multiple times accumulates their claimable amount.
     */
    function finalizeSessionRewards(
        uint256 sessionId,
        address[] calldata winners,
        uint256[] calldata amounts
    ) external onlyAdmin circuitBreakerClosed sessionExists(sessionId) sessionActive(sessionId) {
        require(winners.length == amounts.length, "Length mismatch");
        require(!snarkelSessions[sessionId].isActive, "Session must be ended");

        Reward[] storage rewards = sessionRewards[sessionId];
        require(rewards.length > 0, "No rewards added");

        // Ensure token consistency
        address rewardTokenAddress = snarkelSessions[sessionId].expectedRewardToken;
        require(rewards[0].tokenAddress == rewardTokenAddress, "Reward token mismatch");

        // Compute total to assign and validate against available pool
        uint256 totalAssign = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAssign += amounts[i];
        }

        require(totalAssign <= rewards[0].amount, "Exceeds available reward");

        for (uint256 i = 0; i < winners.length; i++) {
            address user = winners[i];
            require(user != address(0), "Invalid winner address");
            sessionClaimableRewards[sessionId][user] += amounts[i];
            emit UserRewardSet(sessionId, user, amounts[i]);
            // Increment wins if they received a positive amount
            if (amounts[i] > 0) {
                sessionWinsCount[sessionId][user] += 1;
                emit UserWinRecorded(sessionId, user, sessionWinsCount[sessionId][user]);
            }
        }

        sessionRewardsFinalized[sessionId] = true;
        emit SessionRewardsFinalized(sessionId, rewardTokenAddress, totalAssign, winners.length);
    }

    /**
     * @dev Claim a user's finalized reward for a session.
     *      Transfers from the session's reward pool to the caller.
     */
    function claimUserReward(uint256 sessionId, address tokenAddress)
        external
        nonReentrant
        sessionExists(sessionId)
    {
        uint256 amount = sessionClaimableRewards[sessionId][msg.sender];
        require(amount > 0, "Nothing to claim");

        // Validate token and available pool
        Reward[] storage rewards = sessionRewards[sessionId];
        uint256 rewardIndex = type(uint256).max;
        for (uint256 i = 0; i < rewards.length; i++) {
            if (rewards[i].tokenAddress == tokenAddress && !rewards[i].isDistributed) {
                rewardIndex = i;
                break;
            }
        }
        require(rewardIndex != type(uint256).max, "Reward not found");
        require(rewards[rewardIndex].amount >= amount, "Insufficient pool");

        // Effects
        sessionClaimableRewards[sessionId][msg.sender] = 0;
        snarkelSessions[sessionId].hasClaimedReward[msg.sender] = true;
        rewards[rewardIndex].amount -= amount;
        if (rewards[rewardIndex].amount == 0) {
            rewards[rewardIndex].isDistributed = true;
        }

        // Interactions
        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(msg.sender, amount), "Token transfer failed");

        emit RewardClaimed(sessionId, msg.sender, tokenAddress, amount);
    }

    /**
     * @dev Fallback reward distribution for quiz admins
     * @dev Allows session creator to distribute rewards if main distribution fails
     * @param sessionId ID of the session
     * @param tokenAddress Address of the reward token
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to distribute
     */
    function fallbackDistributeRewards(
        uint256 sessionId,
        address tokenAddress,
        address[] memory recipients,
        uint256[] memory amounts
    ) 
        external 
        circuitBreakerClosed
        sessionExists(sessionId) 
    {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length > 0, "No recipients");
        
        // Only session creator or super admin can call this
        require(
            msg.sender == sessionCreator[sessionId] || 
            superAdmins[msg.sender] || 
            adminWallets[msg.sender],
            "Not authorized"
        );
        
        // Check if session is banned
        require(!sessionBanned[sessionId], "Session is banned");
        
        // Check if rewards are already finalized
        require(!sessionRewardsFinalized[sessionId], "Rewards already finalized");
        
        IERC20 token = IERC20(tokenAddress);
        uint256 totalAmount = 0;
        
        // Calculate total amount and check balances
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(
            token.balanceOf(address(this)) >= totalAmount,
            "Insufficient token balance for fallback distribution"
        );
        
        // Distribute rewards
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] > 0 && recipients[i] != address(0)) {
                require(
                    token.transfer(recipients[i], amounts[i]),
                    "Token transfer failed"
                );
                
                // Update claimable rewards
                sessionClaimableRewards[sessionId][recipients[i]] = amounts[i];
                
                emit RewardClaimed(sessionId, recipients[i], tokenAddress, amounts[i]);
            }
        }
        
        // Mark rewards as finalized
        sessionRewardsFinalized[sessionId] = true;
        
        emit SessionRewardsFinalized(sessionId, tokenAddress, totalAmount, recipients.length);
        emit FallbackRewardsDistributed(sessionId, tokenAddress, totalAmount, recipients.length);
    }

    /**
     * @dev Handle partial reward distribution failures
     * @dev Allows recovery of undistributed rewards if distribution fails partially
     * @param sessionId ID of the session
     * @param tokenAddress Address of the reward token
     * @param failedRecipients Array of addresses where distribution failed
     * @param failedAmounts Array of amounts that failed to distribute
     */
    function handlePartialDistributionFailure(
        uint256 sessionId,
        address tokenAddress,
        address[] memory failedRecipients,
        uint256[] memory failedAmounts
    ) 
        external 
        circuitBreakerClosed
        sessionExists(sessionId) 
    {
        require(failedRecipients.length == failedAmounts.length, "Length mismatch");
        require(failedRecipients.length > 0, "No failed recipients");
        
        // Only session creator, super admin, or admin can call this
        require(
            msg.sender == sessionCreator[sessionId] || 
            superAdmins[msg.sender] || 
            adminWallets[msg.sender],
            "Not authorized"
        );
        
        // Check if session is banned
        require(!sessionBanned[sessionId], "Session is banned");
        
        // Calculate total failed amount
        uint256 totalFailedAmount = 0;
        for (uint256 i = 0; i < failedAmounts.length; i++) {
            totalFailedAmount += failedAmounts[i];
        }
        
        // Mark these amounts as available for redistribution
        for (uint256 i = 0; i < failedRecipients.length; i++) {
            if (failedAmounts[i] > 0) {
                // Reset claimable rewards for failed recipients
                sessionClaimableRewards[sessionId][failedRecipients[i]] = 0;
            }
        }
        
        emit RewardDistributed(sessionId, tokenAddress, totalFailedAmount);
        emit PartialDistributionFailureHandled(sessionId, tokenAddress, totalFailedAmount);
    }

    /**
     * @dev Emergency recovery of undistributed rewards
     * @dev Allows super admin to recover rewards that couldn't be distributed
     * @param sessionId ID of the session
     * @param tokenAddress Address of the reward token
     * @param recipient Address to receive the undistributed rewards
     */
    function emergencyRecoverUndistributedRewards(
        uint256 sessionId,
        address tokenAddress,
        address recipient
    ) 
        external 
        onlySuperAdmin 
        circuitBreakerClosed
        sessionExists(sessionId) 
    {
        require(recipient != address(0), "Invalid recipient address");
        
        // Check if session is banned or inactive
        require(
            sessionBanned[sessionId] || !snarkelSessions[sessionId].isActive,
            "Session is active and not banned"
        );
        
        IERC20 token = IERC20(tokenAddress);
        uint256 contractBalance = token.balanceOf(address(this));
        
        require(contractBalance > 0, "No tokens to recover");
        
        // Transfer all undistributed tokens to recipient
        require(
            token.transfer(recipient, contractBalance),
            "Token transfer failed"
        );
        
        emit AdminRewardDistributed(sessionId, recipient, tokenAddress, contractBalance, msg.sender);
        emit EmergencyRewardsRecovered(sessionId, tokenAddress, contractBalance, recipient);
    }

    /**
     * @dev Helper: Can a new session be started for this snarkel code?
     *      Returns (canStart, lastSessionId, lastIsActive)
     */
    function canStartNewSession(string memory snarkelCode)
        external
        view
        returns (bool, uint256, bool)
    {
        uint256 lastId = snarkelCodeToSessionId[snarkelCode];
        if (lastId == 0) {
            return (true, 0, false);
        }
        bool active = snarkelSessions[lastId].isActive;
        return (!active, lastId, active);
    }

    // Views for frontends
    function getUserClaimable(uint256 sessionId, address user) external view returns (uint256) {
        return sessionClaimableRewards[sessionId][user];
    }

    function getUserWins(uint256 sessionId, address user) external view returns (uint256) {
        return sessionWinsCount[sessionId][user];
    }

    // Admin functions

    /**
     * @dev Add admin wallet
     * @param admin Address to add as admin
     */
    function addAdminWallet(address admin) 
        external 
        onlyOwner 
        circuitBreakerClosed 
    {
        require(admin != address(0), "Invalid admin address");
        adminWallets[admin] = true;
        emit AdminWalletAdded(admin);
    }

    /**
     * @dev Remove admin wallet
     * @param admin Address to remove as admin
     */
    function removeAdminWallet(address admin) 
        external 
        onlyOwner 
        circuitBreakerClosed 
    {
        require(admin != address(0), "Invalid admin address");
        adminWallets[admin] = false;
        emit AdminWalletRemoved(admin);
    }

    /**
     * @dev Add super admin
     * @param superAdmin Address to add as super admin
     */
    function addSuperAdmin(address superAdmin) 
        external 
        onlyOwner 
        circuitBreakerClosed 
    {
        require(superAdmin != address(0), "Invalid super admin address");
        superAdmins[superAdmin] = true;
        emit SuperAdminAdded(superAdmin);
    }

    /**
     * @dev Remove super admin
     * @param superAdmin Address to remove as super admin
     */
    function removeSuperAdmin(address superAdmin) 
        external 
        onlyOwner 
        circuitBreakerClosed 
    {
        require(superAdmin != address(0), "Invalid super admin address");
        superAdmins[superAdmin] = false;
        emit SuperAdminRemoved(superAdmin);
    }

    /**
     * @dev Verify a user (allows them to claim rewards without being in session)
     * @param user Address of the user to verify
     */
    function verifyUser(address user) 
        external 
        onlyAdmin 
        circuitBreakerClosed 
    {
        require(user != address(0), "Invalid user address");
        verifiedUsers[user] = true;
        emit UserVerified(user, msg.sender);
    }

    /**
     * @dev Set snarkel fee
     * @param snarkelId ID of the snarkel
     * @param feeAmount Fee amount
     * @param tokenAddress Token address for the fee
     */
    function setSnarkelFee(uint256 snarkelId, uint256 feeAmount, address tokenAddress) 
        external 
        onlyAdmin 
    {
        snarkelFees[snarkelId] = SnarkelFee({
            feeAmount: feeAmount,
            tokenAddress: tokenAddress,
            isActive: true
        });
        
        emit SnarkelFeeUpdated(snarkelId, feeAmount, tokenAddress);
    }

    /**
     * @dev Update session parameters
     * @param sessionId ID of the session
     * @param entryFee New entry fee
     * @param platformFeePercentage New platform fee percentage
     * @param maxParticipants New max participants
     */
    function updateSession(
        uint256 sessionId,
        uint256 entryFee,
        uint256 platformFeePercentage,
        uint256 maxParticipants
    ) external onlyAdmin sessionExists(sessionId) {
        require(platformFeePercentage <= 1000, "Platform fee cannot exceed 10%");
        require(maxParticipants >= snarkelSessions[sessionId].currentParticipants, "Max participants too low");

        SnarkelSession storage session = snarkelSessions[sessionId];
        session.entryFee = entryFee;
        session.platformFeePercentage = platformFeePercentage;
        session.maxParticipants = maxParticipants;
    }

    /**
     * @dev Deactivate a session
     * @param sessionId ID of the session
     */
    function deactivateSession(uint256 sessionId) 
        external 
        onlyAdmin 
        circuitBreakerClosed
        sessionExists(sessionId) 
    {
        snarkelSessions[sessionId].isActive = false;
    }

    /**
     * @dev Ban a session
     * @param sessionId ID of the session to ban
     */
    function banSession(uint256 sessionId) 
        external 
        onlySuperAdmin 
        circuitBreakerClosed 
    {
        sessionBanned[sessionId] = true;
        emit SessionBanned(sessionId, msg.sender);
    }

    /**
     * @dev Unban a session
     * @param sessionId ID of the session to unban
     */
    function unbanSession(uint256 sessionId) 
        external 
        onlySuperAdmin 
        circuitBreakerClosed 
    {
        sessionBanned[sessionId] = false;
        emit SessionUnbanned(sessionId, msg.sender);
    }

    /**
     * @dev Check if a session is banned
     * @param sessionId ID of the session to check
     */
    function isSessionBanned(uint256 sessionId) 
        external 
        view 
        returns (bool) 
    {
        return sessionBanned[sessionId];
    }

    /**
     * @dev Check if an address is the creator of a session
     * @param sessionId ID of the session
     * @param creator Address to check
     */
    function isSessionCreator(uint256 sessionId, address creator) 
        external 
        view 
        returns (bool) 
    {
        return sessionCreator[sessionId] == creator;
    }

    /**
     * @dev Get session creator address
     * @param sessionId ID of the session
     */
    function getSessionCreator(uint256 sessionId) 
        external 
        view 
        returns (address) 
    {
        return sessionCreator[sessionId];
    }

    // View functions

    /**
     * @dev Get session details
     * @param sessionId ID of the session
     */
    function getSession(uint256 sessionId) 
        external 
        view 
        sessionExists(sessionId) 
        returns (
            uint256 sessionId_,
            string memory snarkelCode,
            uint256 entryFee,
            uint256 platformFeePercentage,
            uint256 maxParticipants,
            uint256 currentParticipants,
            bool isActive,
            uint256 createdAt,
            address[] memory participants,
            address expectedRewardToken,
            uint256 expectedRewardAmount
        ) 
    {
        SnarkelSession storage session = snarkelSessions[sessionId];
        return (
            session.sessionId,
            session.snarkelCode,
            session.entryFee,
            session.platformFeePercentage,
            session.maxParticipants,
            session.currentParticipants,
            session.isActive,
            session.createdAt,
            session.participants,
            session.expectedRewardToken,
            session.expectedRewardAmount
        );
    }

    /**
     * @dev Check if address is participant in session
     * @param sessionId ID of the session
     * @param participant Address to check
     */
    function isParticipant(uint256 sessionId, address participant) 
        external 
        view 
        sessionExists(sessionId) 
        returns (bool) 
    {
        return snarkelSessions[sessionId].isParticipant[participant];
    }

    /**
     * @dev Check if address has claimed reward in session
     * @param sessionId ID of the session
     * @param participant Address to check
     */
    function hasClaimedReward(uint256 sessionId, address participant) 
        external 
        view 
        sessionExists(sessionId) 
        returns (bool) 
    {
        return snarkelSessions[sessionId].hasClaimedReward[participant];
    }

    /**
     * @dev Get session rewards
     * @param sessionId ID of the session
     */
    function getSessionRewards(uint256 sessionId) 
        external 
        view 
        sessionExists(sessionId) 
        returns (Reward[] memory) 
    {
        return sessionRewards[sessionId];
    }

    /**
     * @dev Get session ID by snarkel code
     * @param snarkelCode Snarkel code
     */
    function getSessionIdByCode(string memory snarkelCode) external view returns (uint256) {
        return snarkelCodeToSessionId[snarkelCode];
    }

    /**
     * @dev Get current session count
     */
    function getCurrentSessionId() external view returns (uint256) {
        return _sessionIds;
    }

    /**
     * @dev Check if an address is an admin
     * @param admin Address to check
     */
    function isAdmin(address admin) external view returns (bool) {
        return adminWallets[admin] || admin == owner();
    }

    /**
     * @dev Check if rewards have been distributed for a snarkel code
     * @param snarkelCode Snarkel code to check
     */
    function areRewardsDistributed(string memory snarkelCode) external view returns (bool) {
        return snarkelCodeRewardsDistributed[snarkelCode];
    }

    /**
     * @dev Get reward token address for a session
     * @param sessionId ID of the session
     */
    function getRewardTokenAddress(uint256 sessionId) 
        external 
        view 
        sessionExists(sessionId) 
        returns (address) 
    {
        return snarkelSessions[sessionId].expectedRewardToken;
    }

    /**
     * @dev Get expected reward amount for a session
     * @param sessionId ID of the session
     */
    function getExpectedRewardAmount(uint256 sessionId) 
        external 
        view 
        sessionExists(sessionId) 
        returns (uint256) 
    {
        return snarkelSessions[sessionId].expectedRewardAmount;
    }

    /**
     * @dev Get available reward amount for a session
     * @param sessionId ID of the session
     */
    function getAvailableRewardAmount(uint256 sessionId) 
        external 
        view 
        sessionExists(sessionId) 
        returns (uint256) 
    {
        Reward[] storage rewards = sessionRewards[sessionId];
        if (rewards.length == 0) {
            return 0;
        }
        return rewards[0].amount;
    }

    /**
     * @dev Get total participants for a session
     * @param sessionId ID of the session
     */
    function getParticipantCount(uint256 sessionId) 
        external 
        view 
        sessionExists(sessionId) 
        returns (uint256) 
    {
        return snarkelSessions[sessionId].currentParticipants;
    }
    

    /**
     * @dev Withdraw platform fees (owner only)
     */
    function withdrawFees() 
        external 
        onlyOwner 
        circuitBreakerClosed 
    {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
    }

    /**
     * @dev Emergency withdraw ERC20 tokens (owner only)
     * @param tokenAddress Address of the token to withdraw
     */
    function emergencyWithdrawToken(address tokenAddress) 
        external 
        onlyOwner 
        circuitBreakerClosed 
    {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        require(token.transfer(owner(), balance), "Token transfer failed");
    }

    /**
     * @dev Batch add participants (admin only) - for efficiency
     * @param sessionId ID of the session
     * @param participants Array of participant addresses
     */
    function batchAddParticipants(uint256 sessionId, address[] memory participants) 
        external 
        onlyAdmin 
        sessionExists(sessionId) 
        sessionActive(sessionId) 
    {
        SnarkelSession storage session = snarkelSessions[sessionId];
        
        require(
            session.currentParticipants + participants.length <= session.maxParticipants, 
            "Would exceed max participants"
        );

        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            require(participant != address(0), "Invalid participant address");
            require(!session.isParticipant[participant], "Participant already exists");
            
            session.participants.push(participant);
            session.isParticipant[participant] = true;
            session.currentParticipants++;
            
            emit ParticipantAdded(sessionId, participant, msg.sender);
        }
    }

    /**
     * @dev Remove participant from session (admin only)
     * @param sessionId ID of the session
     * @param participant Address of participant to remove
     */
    function removeParticipant(uint256 sessionId, address participant) 
        external 
        onlyAdmin 
        sessionExists(sessionId) 
    {
        SnarkelSession storage session = snarkelSessions[sessionId];
        require(session.isParticipant[participant], "Not a participant");
        
        // Remove from participants array
        for (uint256 i = 0; i < session.participants.length; i++) {
            if (session.participants[i] == participant) {
                session.participants[i] = session.participants[session.participants.length - 1];
                session.participants.pop();
                break;
            }
        }
        
        session.isParticipant[participant] = false;
        session.currentParticipants--;
    }

    /**
     * @dev Super admin emergency token withdrawal for banned sessions
     * @dev Allows super admin to recover tokens from banned sessions
     * @param sessionId ID of the banned session
     * @param tokenAddress Address of the token to withdraw
     * @param recipient Address to receive the tokens
     * @param amount Amount to withdraw
     */
    function superAdminWithdrawFromBannedSession(
        uint256 sessionId,
        address tokenAddress,
        address recipient,
        uint256 amount
    ) 
        external 
        onlySuperAdmin 
        circuitBreakerClosed
        sessionExists(sessionId) 
    {
        require(sessionBanned[sessionId], "Session is not banned");
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20 token = IERC20(tokenAddress);
        uint256 contractBalance = token.balanceOf(address(this));
        
        require(contractBalance >= amount, "Insufficient token balance");
        
        // Transfer tokens to recipient
        require(
            token.transfer(recipient, amount),
            "Token transfer failed"
        );
        
        emit AdminRewardDistributed(sessionId, recipient, tokenAddress, amount, msg.sender);
    }

    /**
     * @dev Super admin emergency withdrawal of all tokens from banned session
     * @dev Allows super admin to recover all tokens from a banned session
     * @param sessionId ID of the banned session
     * @param tokenAddress Address of the token to withdraw
     * @param recipient Address to receive the tokens
     */
    function superAdminWithdrawAllFromBannedSession(
        uint256 sessionId,
        address tokenAddress,
        address recipient
    ) 
        external 
        onlySuperAdmin 
        circuitBreakerClosed
        sessionExists(sessionId) 
    {
        require(sessionBanned[sessionId], "Session is not banned");
        require(recipient != address(0), "Invalid recipient address");
        
        IERC20 token = IERC20(tokenAddress);
        uint256 contractBalance = token.balanceOf(address(this));
        
        require(contractBalance > 0, "No tokens to withdraw");
        
        // Transfer all tokens to recipient
        require(
            token.transfer(recipient, contractBalance),
            "Token transfer failed"
        );
        
        emit AdminRewardDistributed(sessionId, recipient, tokenAddress, contractBalance, msg.sender);
    }
}