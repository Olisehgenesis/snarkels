const { createServer } = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"]
  },
  // Optimized connection handling
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  allowUpgrades: true,
  transports: ['websocket'], // Remove polling to prevent connection switching
  // Improved connection settings
  connectTimeout: 45000,
  maxHttpBufferSize: 1e6,
  // Remove heartbeat as it's not a valid Socket.IO option
});

// Track active connections to prevent duplicates
const activeConnections = new Map(); // roomId -> Map(walletAddress -> socketId)
const socketToUser = new Map(); // socketId -> { roomId, walletAddress, userId }

// Add health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: io.engine.clientsCount,
      activeConnections: activeConnections.size,
      uptime: process.uptime()
    }));
  }
});

// Store active rooms and their state
const activeRooms = new Map();

// Store question answers and scores for each room
const questionAnswers = new Map(); // roomId -> Map(questionId -> answers)
const roomScores = new Map(); // roomId -> Map(userId -> score)

// Enhanced countdown tracking
const activeCountdowns = new Map(); // roomId -> { interval, timeLeft, originalTime, isActive }
const countdownGracePeriods = new Map(); // roomId -> gracePeriodEndTime

// Helper function to check if user is already connected to a room
function isUserAlreadyConnected(roomId, walletAddress, currentSocketId = null) {
  const roomConnections = activeConnections.get(roomId);
  if (!roomConnections) return false;
  
  const existingSocketId = roomConnections.get(walletAddress);
  if (!existingSocketId) return false;
  
  // If checking from current socket, don't consider it as "already connected"
  if (currentSocketId && existingSocketId === currentSocketId) {
    return false;
  }
  
  // Check if the existing socket is still connected
  const existingSocket = io.sockets.sockets.get(existingSocketId);
  return existingSocket && existingSocket.connected;
}

// Helper function to add connection tracking
function addConnectionTracking(roomId, walletAddress, socketId, userId) {
  if (!activeConnections.has(roomId)) {
    activeConnections.set(roomId, new Map());
  }
  
  const roomConnections = activeConnections.get(roomId);
  roomConnections.set(walletAddress, socketId);
  
  socketToUser.set(socketId, { roomId, walletAddress, userId });
}

// Helper function to remove connection tracking
function removeConnectionTracking(socketId) {
  const userInfo = socketToUser.get(socketId);
  if (!userInfo) return;
  
  const { roomId, walletAddress } = userInfo;
  
  // Remove from active connections
  const roomConnections = activeConnections.get(roomId);
  if (roomConnections) {
    roomConnections.delete(walletAddress);
    
    // Clean up empty room connections
    if (roomConnections.size === 0) {
      activeConnections.delete(roomId);
    }
  }
  
  // Remove from socket mapping
  socketToUser.delete(socketId);
}

// Helper function to get participant info safely
async function getParticipantInfo(roomId, userId) {
  try {
    console.log('Looking for participant:', { roomId, userId });
    
    const participant = await prisma.roomParticipant.findFirst({
      where: {
        roomId,
        userId
      }
    });
    
    console.log('Participant lookup result:', {
      roomId,
      userId,
      participantFound: !!participant,
      participantId: participant?.id,
      participantUserId: participant?.userId
    });
    
    return participant;
  } catch (error) {
    console.error('Error getting participant info:', error);
    return null;
  }
}

// Helper function to get room participants with names
async function getRoomParticipantsWithNames(roomId) {
  try {
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    return participants.map(p => ({
      id: p.id,
      userId: p.userId,
      isAdmin: p.isAdmin,
      isReady: p.isReady,
      joinedAt: p.joinedAt,
      user: {
        id: p.user.id,
        address: p.user.address,
        name: p.user.name
      }
    }));
  } catch (error) {
    console.error('Error getting room participants with names:', error);
    return [];
  }
}

// Helper function to start or restart countdown with grace period
function startCountdown(roomId, countdownTime, isRestart = false) {
  console.log(`Starting countdown for room ${roomId} with ${countdownTime}s${isRestart ? ' (restart)' : ''}`);
  
  // Clear existing countdown if any
  if (activeCountdowns.has(roomId)) {
    const existing = activeCountdowns.get(roomId);
    if (existing.interval) {
      clearInterval(existing.interval);
    }
  }
  
  // Set grace period for late joiners (30 seconds)
  const gracePeriodEnd = Date.now() + 30000; // 30 seconds
  countdownGracePeriods.set(roomId, gracePeriodEnd);
  
  // Start countdown
  let timeLeft = countdownTime;
  const originalTime = countdownTime;
  
  const interval = setInterval(() => {
    timeLeft--;
    
    // Emit countdown update
    io.to(roomId).emit('countdownUpdate', timeLeft);
    
    if (timeLeft <= 0) {
      console.log(`Countdown finished for room ${roomId}, starting quiz`);
      clearInterval(interval);
      
      // Clean up countdown tracking
      activeCountdowns.delete(roomId);
      countdownGracePeriods.delete(roomId);
      
      // Start the quiz
      startQuiz(roomId);
    }
  }, 1000);
  
  // Store countdown info
  activeCountdowns.set(roomId, {
    interval,
    timeLeft,
    originalTime,
    isActive: true
  });
  
  // Emit game starting event
  io.to(roomId).emit('gameStarting', countdownTime);
  
  return { interval, timeLeft, originalTime };
}

// Helper function to check if countdown is active for a room
function isCountdownActive(roomId) {
  return activeCountdowns.has(roomId) && activeCountdowns.get(roomId).isActive;
}

// Helper function to restart countdown for late joiners
function restartCountdownForLateJoiner(roomId) {
  if (!isCountdownActive(roomId)) return false;
  
  const countdown = activeCountdowns.get(roomId);
  const gracePeriod = countdownGracePeriods.get(roomId);
  
  // Check if we're still in grace period
  if (gracePeriod && Date.now() < gracePeriod) {
    console.log(`Restarting countdown for room ${roomId} due to late joiner`);
    
    // Restart with original time
    startCountdown(roomId, countdown.originalTime, true);
    return true;
  }
  
  return false;
}

// Helper function to safely disconnect a socket
function safeDisconnect(socket, reason, message) {
  try {
    if (socket && socket.connected) {
      socket.emit('connectionRejected', { reason, message });
      socket.disconnect(true);
    }
  } catch (error) {
    console.error('Error during safe disconnect:', error);
  }
}

// Helper function to check if room is still valid
async function isRoomValid(roomId) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });
    return room && room.isActive && !room.isFinished;
  } catch (error) {
    console.error('Error checking room validity:', error);
    return false;
  }
}

// Helper function to cleanup stale connections
function cleanupStaleConnections() {
  try {
    for (const [roomId, roomConnections] of activeConnections.entries()) {
      for (const [walletAddress, socketId] of roomConnections.entries()) {
        const socket = io.sockets.sockets.get(socketId);
        if (!socket || !socket.connected) {
          console.log(`Cleaning up stale connection: ${socketId} for ${walletAddress} in room ${roomId}`);
          roomConnections.delete(walletAddress);
          
          // Clean up socket mapping
          socketToUser.delete(socketId);
        }
      }
      
      // Clean up empty room connections
      if (roomConnections.size === 0) {
        activeConnections.delete(roomId);
      }
    }
  } catch (error) {
    console.error('Error during connection cleanup:', error);
  }
}

// Run cleanup every 30 seconds
setInterval(cleanupStaleConnections, 30000);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  const { roomId, walletAddress } = socket.handshake.query;
  
  if (!roomId || !walletAddress) {
    console.log('Socket connection rejected: Missing roomId or walletAddress');
    socket.disconnect();
    return;
  }

  // Enhanced wallet address validation
  if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
    console.log('Socket connection rejected: Invalid wallet address format', walletAddress);
    socket.disconnect();
    return;
  }

  // Log connection attempt
  console.log(`Connection attempt: ${socket.id} for ${walletAddress} to room ${roomId}`);

  // Handle room joining with enhanced participant data
  socket.on('joinRoom', async (data) => {
    try {
      const { roomId: joinRoomId, walletAddress: joinWalletAddress, userId: joinUserId, userName } = data;
      
      console.log('Join room request:', { joinRoomId, joinWalletAddress, joinUserId, userName });

      // Check if room is still valid
      if (!(await isRoomValid(joinRoomId))) {
        console.log(`Room ${joinRoomId} is no longer valid during join request`);
        socket.emit('roomJoinError', { 
          reason: 'Room invalid', 
          message: 'This room is no longer available. It may have been closed or finished.' 
        });
        return;
      }

      // Get user information with name
      const user = await prisma.user.findUnique({
        where: { address: joinWalletAddress.toLowerCase() }
      });

      if (!user) {
        console.log(`User not found: ${joinWalletAddress}`);
        socket.emit('roomJoinError', { 
          reason: 'User not found', 
          message: 'User account not found. Please refresh and try again.' 
        });
        return;
      }

      // Check if user is a participant in this room
      const participant = await getParticipantInfo(joinRoomId, user.id);
      if (!participant) {
        console.log(`User ${joinWalletAddress} not a participant in room ${joinRoomId}`);
        
        // Fallback: Check if user is the room admin or snarkel creator
        const room = await prisma.room.findUnique({
          where: { id: joinRoomId },
          include: {
            admin: true,
            snarkel: {
              include: {
                creator: true
              }
            }
          }
        });
        
        if (room && (room.admin.address.toLowerCase() === joinWalletAddress.toLowerCase() || 
                     room.snarkel.creator.address.toLowerCase() === joinWalletAddress.toLowerCase())) {
          console.log(`User ${joinWalletAddress} is room admin or snarkel creator, allowing connection`);
          
          // Create room participant for this user
          const newParticipant = await prisma.roomParticipant.create({
            data: {
              roomId: joinRoomId,
              userId: user.id,
              isReady: false,
              isAdmin: room.admin.address.toLowerCase() === joinWalletAddress.toLowerCase()
            }
          });
          
          console.log('Created room participant for admin/creator:', {
            participantId: newParticipant.id,
            userId: newParticipant.userId,
            isAdmin: newParticipant.isAdmin
          });
          
          // Continue with connection
        } else {
          socket.emit('roomJoinError', { 
            reason: 'Not a participant', 
            message: 'You are not a participant in this room. Please join the room first.' 
          });
          return;
        }
      }

      // Double-check that user isn't already connected from another socket
      if (isUserAlreadyConnected(joinRoomId, joinWalletAddress, socket.id)) {
        console.log(`User ${joinWalletAddress} already connected to room ${joinRoomId} from another socket`);
        socket.emit('roomJoinError', { 
          reason: 'Already connected', 
          message: 'You are already connected to this room from another tab or device.' 
        });
        return;
      }

      // Add connection tracking
      addConnectionTracking(joinRoomId, joinWalletAddress, socket.id, user.id);
      
      // Join the room
      socket.join(joinRoomId);
      console.log(`User ${joinWalletAddress} (${user.name || 'Unknown'}) joined room ${joinRoomId} (socket: ${socket.id})`);

      // Get enhanced participant data with names
      const roomParticipants = await getRoomParticipantsWithNames(joinRoomId);
      
      // Notify other participants about the new join with enhanced data
      socket.to(joinRoomId).emit('participantJoined', {
        id: participant?.id || 'new',
        userId: user.id,
        walletAddress: joinWalletAddress,
        name: user.name || 'Unknown User',
        isAdmin: participant?.isAdmin || false,
        isReady: participant?.isReady || false,
        joinedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        user: {
          id: user.id,
          address: joinWalletAddress,
          name: user.name || 'Unknown User'
        }
      });

      // Send room joined confirmation with participant data
      socket.emit('roomJoined', {
        roomId: joinRoomId,
        participantCount: roomParticipants.length,
        participants: roomParticipants,
        currentUser: {
          id: participant?.id || 'new',
          userId: user.id,
          walletAddress: joinWalletAddress,
          name: user.name || 'Unknown User',
          isAdmin: participant?.isAdmin || false,
          isReady: participant?.isReady || false
        }
      });

      // Emit room stats update when user joins
      emitRoomStatsUpdate(joinRoomId);
      
      // Check if there's an active countdown and restart it for late joiners
      if (isCountdownActive(joinRoomId)) {
        const wasRestarted = restartCountdownForLateJoiner(joinRoomId);
        if (wasRestarted) {
          console.log(`Countdown restarted for late joiner in room ${joinRoomId}`);
          // Notify all participants about the countdown restart
          io.to(joinRoomId).emit('countdownRestarted', {
            message: 'Countdown restarted for new participant!',
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      console.error('Error during room join:', error);
      socket.emit('roomJoinError', { 
        reason: 'Server error', 
        message: 'An error occurred while joining the room. Please try again.' 
      });
    }
  });

  // Handle ping for health check
  socket.on('ping', () => {
    socket.emit('pong', Date.now());
  });

  // Validate room exists and user has access
  socket.on('validateConnection', async (callback) => {
    try {
      // Check if room is still valid
      if (!(await isRoomValid(roomId))) {
        console.log(`Room ${roomId} is no longer valid during manual validation`);
        safeDisconnect(socket, 'Room invalid', 'This room is no longer available. It may have been closed or finished.');
        return;
      }

      const user = await prisma.user.findUnique({
        where: { address: walletAddress.toLowerCase() }
      });

      if (!user) {
        console.log(`User not found: ${walletAddress}`);
        safeDisconnect(socket, 'User not found', 'User account not found. Please refresh and try again.');
        return;
      }

      console.log('Socket validation - user lookup:', {
        walletAddress,
        userId: user.id,
        userAddress: user.address
      });

      // Check if user is a participant in this room
      const participant = await getParticipantInfo(roomId, user.id);
      if (!participant) {
        console.log(`User ${walletAddress} not a participant in room ${roomId}`);
        console.log('Participant lookup failed for:', { roomId, userId: user.id });
        
        // Fallback: Check if user is the room admin or snarkel creator
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            admin: true,
            snarkel: {
              include: {
                creator: true
              }
            }
          }
        });
        
        if (room && (room.admin.address.toLowerCase() === walletAddress.toLowerCase() || 
                     room.snarkel.creator.address.toLowerCase() === walletAddress.toLowerCase())) {
          console.log(`User ${walletAddress} is room admin or snarkel creator, allowing connection`);
          
          // Create room participant for this user
          const newParticipant = await prisma.roomParticipant.create({
            data: {
              roomId: roomId,
              userId: user.id,
              isReady: false,
              isAdmin: room.admin.address.toLowerCase() === walletAddress.toLowerCase()
            }
          });
          
          console.log('Created room participant for admin/creator:', {
            participantId: newParticipant.id,
            userId: newParticipant.userId,
            isAdmin: newParticipant.isAdmin
          });
          
          // Continue with connection
        } else {
          safeDisconnect(socket, 'Not a participant', 'You are not a participant in this room. Please join the room first.');
          return;
        }
      }

      // Double-check that user isn't already connected from another socket
      if (isUserAlreadyConnected(roomId, walletAddress, socket.id)) {
        console.log(`User ${walletAddress} already connected to room ${roomId} from another socket during manual validation`);
        safeDisconnect(socket, 'Already connected', 'You are already connected to this room from another tab or device.');
        return;
      }

      // Add connection tracking
      addConnectionTracking(roomId, walletAddress, socket.id, user.id);
      
      // Join the room
      socket.join(roomId);
      console.log(`User ${walletAddress} manually joined room ${roomId} (socket: ${socket.id})`);

      // Notify other participants about the new join
      socket.to(roomId).emit('participantJoined', {
        walletAddress,
        timestamp: new Date().toISOString()
      });

      // Emit room stats update when user joins
      emitRoomStatsUpdate(roomId);

      // Send connection success confirmation
      if (callback && typeof callback === 'function') {
        callback({ success: true, participant });
      }

    } catch (error) {
      console.error('Error validating connection:', error);
      safeDisconnect(socket, 'Validation error', 'Error validating your connection. Please try again.');
    }
  });

  // Auto-validate connection after a short delay to allow client to set up
  // This ensures the connection is properly validated even if manual validation fails
  setTimeout(async () => {
    try {
      // Check if socket is already validated and connected
      if (!socket.connected) {
        console.log(`Socket ${socket.id} disconnected before auto-validation could complete`);
        return;
      }

      // Check if user is already tracked (meaning manual validation succeeded)
      const userInfo = socketToUser.get(socket.id);
      if (userInfo) {
        console.log(`Socket ${socket.id} already validated and tracked, skipping auto-validation`);
        return;
      }

      console.log(`Auto-validating socket ${socket.id} for ${walletAddress} in room ${roomId}`);

      // Check if room is still valid
      if (!(await isRoomValid(roomId))) {
        console.log(`Room ${roomId} is no longer valid during auto-validation`);
        safeDisconnect(socket, 'Room invalid', 'This room is no longer available. It may have been closed or finished.');
        return;
      }

      const user = await prisma.user.findUnique({
        where: { address: walletAddress.toLowerCase() }
      });

      if (!user) {
        console.log(`User not found during auto-validation: ${walletAddress}`);
        safeDisconnect(socket, 'User not found', 'User account not found. Please refresh and try again.');
        return;
      }

      // Check if user is a participant in this room
      const participant = await getParticipantInfo(roomId, user.id);
      if (!participant) {
        console.log(`User ${walletAddress} not a participant in room ${roomId} during auto-validation`);
        
        // Fallback: Check if user is the room admin or snarkel creator
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            admin: true,
            snarkel: {
              include: {
                creator: true
              }
            }
          }
        });
        
        if (room && (room.admin.address.toLowerCase() === walletAddress.toLowerCase() || 
                     room.snarkel.creator.address.toLowerCase() === walletAddress.toLowerCase())) {
          console.log(`User ${walletAddress} is room admin or snarkel creator during auto-validation, allowing connection`);
          
          // Create room participant for this user
          const newParticipant = await prisma.roomParticipant.create({
            data: {
              roomId: roomId,
              userId: user.id,
              isReady: false,
              isAdmin: room.admin.address.toLowerCase() === walletAddress.toLowerCase()
            }
          });
          
          console.log('Created room participant for admin/creator during auto-validation:', {
            participantId: newParticipant.id,
            userId: newParticipant.userId,
            isAdmin: newParticipant.isAdmin
          });
          
          // Continue with connection
        } else {
          safeDisconnect(socket, 'Not a participant', 'You are not a participant in this room. Please join the room first.');
          return;
        }
      }

      // Check if user is already connected from another socket
      if (isUserAlreadyConnected(roomId, walletAddress, socket.id)) {
        console.log(`User ${walletAddress} already connected to room ${roomId} from another socket during auto-validation`);
        safeDisconnect(socket, 'Already connected', 'You are already connected to this room from another tab or device.');
        return;
      }

      // Add connection tracking
      addConnectionTracking(roomId, walletAddress, socket.id, user.id);
      
      // Join the room
      socket.join(roomId);
      console.log(`User ${walletAddress} auto-joined room ${roomId} (socket: ${socket.id})`);

      // Notify other participants about the new join
      socket.to(roomId).emit('participantJoined', {
        walletAddress,
        timestamp: new Date().toISOString()
      });

      // Emit room stats update when user joins
      emitRoomStatsUpdate(roomId);

      // Emit connection validated event
      socket.emit('connectionValidated', { 
        success: true, 
        participant,
        roomId,
        walletAddress
      });

    } catch (error) {
      console.error('Error during auto-validation:', error);
      if (socket.connected) {
        safeDisconnect(socket, 'Validation error', 'Error validating your connection. Please try again.');
      }
    }
  }, 2000); // Increased delay to 2 seconds to allow manual validation to complete

  // Add connection monitoring
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });

  socket.on('disconnect', (reason) => {
    const userInfo = socketToUser.get(socket.id);
    if (userInfo) {
      const { roomId, walletAddress } = userInfo;
      console.log(`User ${walletAddress} disconnected from room ${roomId}, reason: ${reason}`);
      
      // Remove connection tracking
      removeConnectionTracking(socket.id);
      
      // Clean up any room-specific data if needed
      if (reason === 'io server disconnect') {
        // Server initiated disconnect
        console.log('Server initiated disconnect');
      }
    }
  });

  // Handle connection timeout
  socket.on('connect_timeout', () => {
    console.log(`Connection timeout for ${socket.id}`);
  });

  // Handle connection error
  socket.on('connect_error', (error) => {
    console.error(`Connection error for ${socket.id}:`, error);
  });

  // Handle ready toggle
  socket.on('toggleReady', async () => {
    try {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) {
        console.log('Socket not found in tracking, ignoring toggleReady');
        return;
      }

      const { roomId, userId } = userInfo;
      console.log(`toggleReady event received from user ${userId} in room ${roomId}`);
      
      // Update participant ready status in database
      const participant = await getParticipantInfo(roomId, userId);

      if (participant) {
        // Toggle the ready status
        const newReadyStatus = !participant.isReady;
        console.log(`Toggling ready status for participant ${participant.id} from ${participant.isReady} to ${newReadyStatus}`);
        
        await prisma.roomParticipant.update({
          where: { id: participant.id },
          data: { isReady: newReadyStatus }
        });

        // Get updated participant info
        const updatedParticipant = await getParticipantInfo(roomId, userId);
        console.log(`Updated participant ready status in database:`, updatedParticipant);
        
        // Emit participant ready update to ALL clients in the room (including sender)
        console.log(`Emitting participantReadyUpdated to room ${roomId} for participant ${participant.id}`);
        io.to(roomId).emit('participantReadyUpdated', {
          participantId: participant.id,
          isReady: newReadyStatus,
          userId: userId
        });
        
        // Also emit the specific participant ready event for backward compatibility
        console.log(`Emitting participantReady to other clients in room ${roomId}`);
        socket.to(roomId).emit('participantReady', participant.id);
        
        // Emit room stats update to refresh all client data
        console.log(`Emitting roomStatsUpdate to room ${roomId}`);
        emitRoomStatsUpdate(roomId);
        
        console.log(`User ${userId} toggled ready status to: ${newReadyStatus} - all events emitted`);
      } else {
        console.log(`Participant not found for user ${userId} in room ${roomId}`);
      }
    } catch (error) {
      console.error('Error toggling ready status:', error);
    }
  });

  // Handle game start (admin only)
  socket.on('startGame', async (data) => {
    try {
      console.log('=== startGame event received on server ===');
      console.log('Data received:', data);
      const { countdownTime = 10 } = data || {};
      console.log('Countdown time:', countdownTime);
      
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) {
        console.log('Socket not found in tracking, ignoring startGame');
        return;
      }

      const { roomId, userId } = userInfo;
      
      // Verify user is admin
      const participant = await getParticipantInfo(roomId, userId);

      if (participant && participant.isAdmin) {
        console.log('Admin verified, starting countdown with new system');
        
        // Use the new countdown system
        startCountdown(roomId, countdownTime);
      } else {
        console.log('User is not admin');
      }
      
      console.log('=== startGame event processed ===');
    } catch (error) {
      console.error('Error starting game:', error);
    }
  });

  // Handle admin messages
  socket.on('sendAdminMessage', async (data) => {
    try {
      const { message, timestamp } = data;
      
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) {
        console.log('Socket not found in tracking, ignoring sendAdminMessage');
        return;
      }

      const { roomId, userId } = userInfo;
      
      // Verify user is admin
      const participant = await getParticipantInfo(roomId, userId);

      if (participant && participant.isAdmin && message) {
        // Broadcast message to all clients in room
        io.to(roomId).emit('adminMessageReceived', { message, timestamp });
      }
    } catch (error) {
      console.error('Error sending admin message:', error);
    }
  });

  // Handle regular messages (for backward compatibility)
  socket.on('sendMessage', async (data) => {
    try {
      console.log('Received sendMessage event:', data);
      const { message } = data;
      
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) {
        console.log('Socket not found in tracking, ignoring sendMessage');
        return;
      }

      const { roomId, userId } = userInfo;
      
      // Verify user is admin
      const participant = await getParticipantInfo(roomId, userId);

      console.log('Participant found:', participant ? { isAdmin: participant.isAdmin, userId: participant.userId } : 'not found');

      if (participant && participant.isAdmin && message) {
        console.log('Broadcasting message to room:', roomId, 'Message:', message);
        // Broadcast message to all clients in room
        io.to(roomId).emit('adminMessageReceived', { 
          message, 
          timestamp: new Date().toISOString() 
        });
        console.log('Message broadcasted successfully');
      } else {
        console.log('Message not sent - participant not admin or message empty');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Handle auto-start game (from worker)
  socket.on('autoStartGame', async (data) => {
    try {
      const { roomId, countdownTime = 5 } = data;
      
      console.log(`Auto-starting game for room: ${roomId}`);
      
      // Use the new countdown system
      startCountdown(roomId, countdownTime * 60); // Convert to seconds
      
    } catch (error) {
      console.error('Error auto-starting game:', error);
    }
  });

  // Handle answer submission with immediate scoring
  socket.on('submitAnswer', async (data) => {
    try {
      const { questionId, answerId, timeLeft } = data;
      
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) {
        console.log('Socket not found in tracking, ignoring submitAnswer');
        return;
      }

      const { roomId, userId } = userInfo;
      
      // Get the question to check if answer is correct
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          options: true,
          snarkel: true
        }
      });

      if (!question) {
        console.error('Question not found:', questionId);
        return;
      }

      // Find the selected option
      const selectedOption = question.options.find(opt => opt.id === answerId);
      const isCorrect = selectedOption ? selectedOption.isCorrect : false;

      // Calculate score using quadratic formula
      const basePoints = question.snarkel.basePointsPerQuestion || 100;
      const maxTime = question.timeLimit;
      const timeUsed = maxTime - timeLeft;
      const timeRatio = timeUsed / maxTime;
      
      // Quadratic scoring: faster answers get exponentially more points
      // Formula: basePoints * (1 - timeRatio^2)
      const score = isCorrect ? Math.round(basePoints * (1 - Math.pow(timeRatio, 2))) : 0;

      // Store the answer
      if (!questionAnswers.has(roomId)) {
        questionAnswers.set(roomId, new Map());
      }
      const roomQuestionAnswers = questionAnswers.get(roomId);
      if (!roomQuestionAnswers.has(questionId)) {
        roomQuestionAnswers.set(questionId, { answers: [] });
      }

      const questionData = roomQuestionAnswers.get(questionId);
      questionData.answers.push({
        userId,
        answerId,
        isCorrect,
        points: score,
        timeLeft
      });

      // Update room scores
      if (!roomScores.has(roomId)) {
        roomScores.set(roomId, new Map());
      }
      const userScores = roomScores.get(roomId);
      const currentScore = userScores.get(userId) || 0;
      userScores.set(userId, currentScore + score);

      // Get user info for logging
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      console.log(`User ${user ? user.address : userId} submitted answer for question ${questionId}: ${isCorrect ? 'Correct' : 'Incorrect'} (+${score} points)`);
      
      // Emit answer submitted event
      socket.to(roomId).emit('answerSubmitted', {
        userId,
        questionId,
        isCorrect,
        points: score
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    const userInfo = socketToUser.get(socket.id);
    if (!userInfo) {
      console.log('Socket not found in tracking during disconnect');
      return;
    }

    const { roomId, walletAddress, userId } = userInfo;
    console.log(`User ${walletAddress} disconnected from room ${roomId}`);
    
    try {
      // Remove connection tracking first
      removeConnectionTracking(socket.id);
      
      // Check if room is still valid before proceeding
      if (!(await isRoomValid(roomId))) {
        console.log(`Room ${roomId} is no longer valid, skipping participant cleanup`);
        return;
      }
      
      // Update participant count
      const participant = await getParticipantInfo(roomId, userId);

      if (participant) {
        try {
          await prisma.roomParticipant.delete({
            where: { id: participant.id }
          });
        } catch (error) {
          // Participant might have already been deleted, just log and continue
          console.log(`Participant ${participant.id} already removed or not found`);
        }

        // Update room participant count
        await prisma.room.update({
          where: { id: roomId },
          data: {
            currentParticipants: {
              decrement: 1
            }
          }
        });

        // Remove from scoring system
        if (roomScores.has(roomId)) {
          const userScores = roomScores.get(roomId);
          userScores.delete(userId);
        }

        // Remove from current question answers if quiz is active
        if (questionAnswers.has(roomId)) {
          const roomQuestionAnswers = questionAnswers.get(roomId);
          roomQuestionAnswers.forEach((questionData, questionId) => {
            questionData.answers = questionData.answers.filter(answer => answer.userId !== userId);
          });
        }

        // Notify other participants
        socket.to(roomId).emit('participantLeft', participant.id);
        
        // Emit room stats update
        emitRoomStatsUpdate(roomId);
        
        // Check if room is now empty and end quiz if needed
        const remainingParticipants = await prisma.roomParticipant.count({
          where: { roomId }
        });
        
        // Get current room info to check status
        const currentRoom = await prisma.room.findUnique({
          where: { id: roomId }
        });
        
        // If quiz is active and participants drop below minimum, end the quiz
        if (currentRoom && currentRoom.isStarted && remainingParticipants < (currentRoom.minParticipants || 1)) {
          console.log(`Room ${roomId} has insufficient participants during quiz, ending quiz`);
          
          // Clean up countdown if active
          if (activeCountdowns.has(roomId)) {
            const countdown = activeCountdowns.get(roomId);
            if (countdown.interval) {
              clearInterval(countdown.interval);
            }
            activeCountdowns.delete(roomId);
            countdownGracePeriods.delete(roomId);
          }
          
          // End the quiz immediately
          endQuiz(roomId);
          return;
        }
        
        if (remainingParticipants === 0) {
          console.log(`Room ${roomId} is now empty, resetting room`);
          
          // Clean up any active quiz state
          questionAnswers.delete(roomId);
          roomScores.delete(roomId);
          
          // Clean up any active countdowns
          if (activeCountdowns.has(roomId)) {
            const countdown = activeCountdowns.get(roomId);
            if (countdown.interval) {
              clearInterval(countdown.interval);
            }
            activeCountdowns.delete(roomId);
            countdownGracePeriods.delete(roomId);
          }
          
          // Reset the room to initial state (not delete, just reset)
          await prisma.room.update({
            where: { id: roomId },
            data: {
              isStarted: false,
              isWaiting: true,
              isFinished: false,
              isActive: true,
              currentParticipants: 0,
              actualStartTime: null,
              endTime: null
            }
          });
          
          // Notify remaining clients (if any)
          io.to(roomId).emit('roomReset', {
            message: 'Room has been reset and is ready for new participants',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

async function emitRoomStatsUpdate(roomId) {
  try {
    // Get updated room data
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    if (room) {
      // Emit room stats update to all clients in the room
      io.to(roomId).emit('roomStatsUpdate', {
        currentParticipants: room.currentParticipants,
        maxParticipants: room.maxParticipants,
        minParticipants: room.minParticipants,
        isStarted: room.isStarted,
        isWaiting: room.isWaiting,
        participants: room.participants.map(p => ({
          id: p.id,
          userId: p.userId,
          isAdmin: p.isAdmin,
          isReady: p.isReady,
          joinedAt: p.joinedAt,
          user: {
            id: p.user.id,
            address: p.user.address,
            name: p.user.name
          }
        }))
      });
    }
  } catch (error) {
    console.error('Error emitting room stats update:', error);
  }
}

async function startQuiz(roomId) {
  try {
    // Get room and snarkel data
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        snarkel: {
          include: {
            questions: {
              include: {
                options: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        }
      }
    });

    if (!room || !room.snarkel) {
      return;
    }

    // Update room status
    await prisma.room.update({
      where: { id: roomId },
      data: {
        isStarted: true,
        isWaiting: false,
        actualStartTime: new Date()
      }
    });

    // Initialize question answers and scores for this room
    questionAnswers.set(roomId, new Map());
    roomScores.set(roomId, new Map());

    // Start the quiz with questions
    const questions = room.snarkel.questions;
    let currentQuestionIndex = 0;

    const askQuestion = () => {
      if (currentQuestionIndex >= questions.length) {
        // Quiz finished
        endQuiz(roomId);
        return;
      }

      const question = questions[currentQuestionIndex];
      
      // Send question to all clients
      io.to(roomId).emit('questionStart', {
        id: question.id,
        text: question.text,
        timeLimit: question.timeLimit,
        options: question.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect
        }))
      });

      // Set timer for question with countdown updates
      let questionTimeLeft = question.timeLimit;
      const questionTimer = setInterval(() => {
        questionTimeLeft--;
        
        // Emit countdown update every second
        io.to(roomId).emit('questionTimeUpdate', questionTimeLeft);
        
        if (questionTimeLeft <= 0) {
          clearInterval(questionTimer);
          
          // Question time is up - reveal answers
          revealAnswers(roomId, question);
          
          // Wait 10 seconds for answer reveal
          setTimeout(() => {
            // Update leaderboard
            updateLeaderboard(roomId);
            
            // Move to next question
            currentQuestionIndex++;
            setTimeout(askQuestion, 2000);
          }, 10000);
        }
      }, 1000);
    };

    askQuestion();

  } catch (error) {
    console.error('Error starting quiz:', error);
  }
}

async function revealAnswers(roomId, question) {
  try {
    // Get all answers for this question
    const roomQuestionAnswers = questionAnswers.get(roomId);
    const questionData = roomQuestionAnswers?.get(question.id);
    
    if (!questionData) {
      console.log('No answers found for question:', question.id);
      return;
    }

    // Find the correct answer
    const correctOption = question.options.find(opt => opt.isCorrect);
    const correctAnswer = correctOption ? correctOption.text : 'Unknown';

    // Get user names for the answers - prefer actual names over wallet addresses
    const userAnswers = await Promise.all(
      questionData.answers.map(async (answer) => {
        const user = await prisma.user.findUnique({
          where: { id: answer.userId }
        });
        
        let displayName = 'Unknown Player';
        if (user) {
          // Use actual name if available, otherwise use shortened wallet address
          if (user.name && user.name.trim() !== '') {
            displayName = user.name;
          } else if (user.address) {
            displayName = `${user.address.slice(0, 6)}...${user.address.slice(-4)}`;
          }
        }
        
        return {
          userId: answer.userId,
          answerId: answer.answerId,
          isCorrect: answer.isCorrect,
          points: answer.points,
          userName: displayName
        };
      })
    );

    // Emit answer reveal to all clients
    io.to(roomId).emit('answerReveal', {
      questionId: question.id,
      correctAnswer,
      userAnswers
    });

    console.log(`Revealed answers for question ${question.id}:`, userAnswers);

  } catch (error) {
    console.error('Error revealing answers:', error);
  }
}

async function updateLeaderboard(roomId) {
  try {
    const scores = roomScores.get(roomId);
    if (!scores) {
      console.log('No scores found for room:', roomId);
      return;
    }

    // Get user names for the scores - prefer actual names over wallet addresses
    const leaderboard = await Promise.all(
      Array.from(scores.entries()).map(async ([userId, score]) => {
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });
        
        let displayName = 'Unknown Player';
        if (user) {
          // Use actual name if available, otherwise use shortened wallet address
          if (user.name && user.name.trim() !== '') {
            displayName = user.name;
          } else if (user.address) {
            displayName = `${user.address.slice(0, 6)}...${user.address.slice(-4)}`;
          }
        }
        
        return {
          userId,
          name: displayName,
          score
        };
      })
    );

    // Sort by score (highest first)
    leaderboard.sort((a, b) => b.score - a.score);

    // Emit leaderboard update to all clients
    io.to(roomId).emit('leaderboardUpdate', leaderboard);

    console.log(`Updated leaderboard for room ${roomId}:`, leaderboard);

  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
}

async function endQuiz(roomId) {
  try {
    // Get room information first
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        snarkel: true
      }
    });

    if (!room) {
      console.error(`Room ${roomId} not found`);
      return;
    }

    // Update room status to finished and inactive
    await prisma.room.update({
      where: { id: roomId },
      data: {
        isFinished: true,
        isStarted: false,
        isActive: false,
        endTime: new Date()
      }
    });
    
    // Clean up any active countdowns
    if (activeCountdowns.has(roomId)) {
      const countdown = activeCountdowns.get(roomId);
      if (countdown.interval) {
        clearInterval(countdown.interval);
      }
      activeCountdowns.delete(roomId);
      countdownGracePeriods.delete(roomId);
    }

    // Get final leaderboard
    const scores = roomScores.get(roomId);
    if (scores) {
      const finalLeaderboard = await Promise.all(
        Array.from(scores.entries()).map(async ([userId, score]) => {
          const user = await prisma.user.findUnique({
            where: { id: userId }
          });
          
          let displayName = 'Unknown Player';
          if (user) {
            // Use actual name if available, otherwise use shortened wallet address
            if (user.name && user.name.trim() !== '') {
              displayName = user.name;
            } else if (user.address) {
              displayName = `${user.address.slice(0, 6)}...${user.address.slice(-4)}`;
            }
          }
          
          return {
            userId,
            name: displayName,
            score
          };
        })
      );

      finalLeaderboard.sort((a, b) => b.score - a.score);

      // Send final results
      io.to(roomId).emit('gameEnd', finalLeaderboard);
      
      // Emit redirect to leaderboard event
      io.to(roomId).emit('redirectToLeaderboard', {
        snarkelId: room.snarkelId,
        message: 'Quiz completed! Redirecting to leaderboard...'
      });

      // IMPORTANT: Create submissions for ALL completed quizzes, regardless of rewards
      console.log(`Creating submissions for ${finalLeaderboard.length} participants in quiz ${room.snarkelId}`);
      
      try {
        const submissionRecords = await Promise.all(
          finalLeaderboard.map(async (participant) => {
            return prisma.submission.create({
              data: {
                score: participant.score,
                totalPoints: participant.score,
                totalQuestions: room.snarkel.questions?.length || 0,
                timeSpent: 0, // Could be calculated from actual game data
                completedAt: new Date(),
                userId: participant.userId,
                snarkelId: room.snarkelId
              }
            });
          })
        );
        
        console.log(`Successfully created ${submissionRecords.length} submissions for quiz ${room.snarkelId}`);
      } catch (submissionError) {
        console.error(`Error creating submissions for quiz ${room.snarkelId}:`, submissionError);
        // Don't fail the entire process if submission creation fails
      }

      // Automatically distribute rewards if enabled
      if (room.snarkel.rewardsEnabled && room.snarkel.rewards && room.snarkel.rewards.length > 0) {
        console.log(`Rewards enabled for snarkel ${room.snarkelId}, distributing automatically...`);
        
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/quiz/distribute-rewards`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              roomId: roomId,
              finalLeaderboard: finalLeaderboard
            })
          });

          const result = await response.json();
          
          if (result.success) {
            console.log('Automatic reward distribution completed:', result);
            // Emit reward distribution event to clients
            io.to(roomId).emit('rewardsDistributed', {
              success: true,
              message: 'Rewards have been automatically distributed!',
              results: result.results
            });
          } else {
            console.error('Automatic reward distribution failed:', result.error);
            io.to(roomId).emit('rewardsDistributed', {
              success: false,
              message: 'Failed to distribute rewards automatically',
              error: result.error
            });
          }
        } catch (error) {
          console.error('Error calling reward distribution API:', error);
          io.to(roomId).emit('rewardsDistributed', {
            success: false,
            message: 'Error during automatic reward distribution',
            error: error.message
          });
        }
      } else {
        console.log(`Rewards not enabled for snarkel ${room.snarkelId}`);
      }
    }

          // Clean up room data
      questionAnswers.delete(roomId);
      roomScores.delete(roomId);
      
      // Clean up countdown tracking
      if (activeCountdowns.has(roomId)) {
        const countdown = activeCountdowns.get(roomId);
        if (countdown.interval) {
          clearInterval(countdown.interval);
        }
        activeCountdowns.delete(roomId);
        countdownGracePeriods.delete(roomId);
      }

      console.log(`Room ${roomId} finished and closed. New sessions will create new rooms.`);

  } catch (error) {
    console.error('Error ending quiz:', error);
  }
}

const PORT = process.env.SOCKET_PORT || 4001;

httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
  });
}); 