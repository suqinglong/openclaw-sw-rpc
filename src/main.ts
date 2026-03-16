import { OpenClawGatewayClient } from './client';

async function main() {
  console.log('Connecting to OpenClaw Gateway...');
  console.log('');
  console.log('NOTE: The Gateway must be configured with either:');
  console.log('  1. A token (set OPENCLAW_GATEWAY_TOKEN env var)');
  console.log('  2. Or the device must be pre-paired via the Web UI');
  console.log('');

  const client = new OpenClawGatewayClient({
    host: '127.0.0.1',
    port: 18789,
    // Set the token if Gateway is configured with OPENCLAW_GATEWAY_TOKEN
    token: 'clawx-993a437d1a9ae925eef900a0b2e11e3e',
    timeout: 30000,
    reconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    // Test gateway status
    const status = await client.gatewayStatus();
    console.log('Gateway status:', status);

    // Test skills status
    const skillsStatus = await client.skillsStatus();
    console.log('Skills status:', skillsStatus);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.disconnect();
    console.log('Disconnected from OpenClaw Gateway');
  }
}

main();