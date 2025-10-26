const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateNetworkNames() {
  try {
    console.log('Starting network name updates...');

    // Update ALL networks to Base for now (testing purposes)
    const allUpdate = await prisma.snarkelReward.updateMany({
      where: {},
      data: {
        network: 'Base',
        chainId: 8453  // Base chain ID
      }
    });

    console.log(`Updated ${allUpdate.count} records to Base network and chainId 8453`);

    // Show current state
    const rewards = await prisma.snarkelReward.findMany({
      select: {
        id: true,
        network: true,
        chainId: true,
        tokenSymbol: true
      }
    });

    console.log('\nUpdated network state:');
    rewards.forEach(reward => {
      console.log(`ID: ${reward.id}, Network: ${reward.network}, ChainID: ${reward.chainId}, Token: ${reward.tokenSymbol}`);
    });

    console.log('\nAll networks updated to Base successfully!');
  } catch (error) {
    console.error('Error updating network names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateNetworkNames();
