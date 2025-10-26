const { PrismaClient } = require('@prisma/client');
const { io } = require('socket.io-client');
const { privateKeyToAccount } = require('viem/accounts');

// Required environment variables:
// ADMIN_WALLET - Private key for admin wallet (used for socket authentication)
// SOCKET_URL - Socket server URL (optional, defaults to localhost:4001)


const prisma = new PrismaClient();

const adminPrivateKey = process.env.ADMIN_WALLET;

if (!adminPrivateKey) {
  throw new Error('ADMIN_WALLET is not defined');
}

const adminWallet = privateKeyToAccount(adminPrivateKey);
const adminAddress = adminWallet.address;
console.log('Admin address:', adminAddress);

// Connect to socket server with admin address
const socketUrl = process.env.SOCKET_URL || 'http://localhost:4001';

const socket = io(socketUrl, {
  query: {
    roomId: 'admin',
    walletAddress: adminAddress
  }
});

// Check for scheduled quizzes every minute
setInterval(async () => {
  try {
    const now = new Date();
    
    // Find snarkels that should start now
    const scheduledSnarkels = await prisma.snarkel.findMany({
      where: {
        autoStartEnabled: true,
        startTime: {
          lte: now,
          gte: new Date(now.getTime() - 60000) // Within last minute
        },
        isActive: true,
        rooms: {
          some: {
            isStarted: false,
            isFinished: false
          }
        }
      },
      include: {
        rooms: {
          where: {
            isStarted: false,
            isFinished: false
          },
          include: {
            participants: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    for (const snarkel of scheduledSnarkels) {
      console.log(`Auto-starting snarkel: ${snarkel.title} (${snarkel.snarkelCode})`);
      
      // Process each active room for this snarkel
      for (const room of snarkel.rooms) {
        if (room.participants.length >= room.minParticipants) {
          // Emit start game event to socket server
          socket.emit('autoStartGame', {
            roomId: room.id,
            countdownTime: 5 // 5 minute countdown
          });
          
          // Update room status
          await prisma.room.update({
            where: { id: room.id },
            data: {
              isWaiting: false,
              scheduledStartTime: now
            }
          });
          
          console.log(`Successfully auto-started room: ${room.id} for snarkel: ${snarkel.snarkelCode}`);
        } else {
          console.log(`Not enough participants for auto-start in room ${room.id}: ${snarkel.snarkelCode}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in auto-start worker:', error);
  }
}, 60000); // Check every minute

// Handle socket connection
socket.on('connect', () => {
  console.log('Auto-start worker connected to socket server');
});

socket.on('disconnect', () => {
  console.log('Auto-start worker disconnected from socket server');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Auto-start worker shutting down...');
  socket.disconnect();
  process.exit(0);
});

console.log('Auto-start worker started'); 