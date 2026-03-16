import { OpenClawGatewayClient } from './client';

async function main() {
  const client = new OpenClawGatewayClient({
    port: 3000,
    token: 'your-token-here',
    timeout: 30000,
    reconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

  try {
    await client.connect();
    console.log('Connected to OpenClaw Gateway');

    if (client.isConnected()) {
      const status = await client.gatewayStatus();
      console.log('Gateway status:', status);

      const skills = await client.skillsStatus();
      console.log('Skills status:', skills);

      const cronJobs = await client.cronList();
      console.log('Cron jobs:', cronJobs);

      const sessions = await client.sessions();
      console.log('Sessions:', sessions);

      await client.skillsUpdate({
        skillKey: 'example-skill',
        enabled: true,
      });
      console.log('Skill updated');

      await client.cronAdd({
        name: 'test-job',
        schedule: '0 10 * * *',
        prompt: 'Test cron job',
        session: 'isolated',
      });
      console.log('Cron job added');

      await client.cronRemove('test-job');
      console.log('Cron job removed');
    }

    client.disconnect();
    console.log('Disconnected from OpenClaw Gateway');
  } catch (error) {
    console.error('Error:', error);
    client.disconnect();
    process.exit(1);
  }
}

main();