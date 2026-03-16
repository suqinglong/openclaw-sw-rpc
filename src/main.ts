import { OpenClawGatewayClient } from './client';

async function main() {
  console.log('Connecting to OpenClaw Gateway...');
  console.log('');
  console.log('NOTE: The Gateway must be configured with either:');
  console.log('  1. A token (set OPENCLAW_GATEWAY_TOKEN env var)');
  console.log('  2. Or the device must be pre-paired via the Web UI');
  console.log('');

  const token = process.env.OPENCLAW_GATEWAY_TOKEN;
  
  const client = new OpenClawGatewayClient({
    host: '127.0.0.1',
    port: 18789,
    // Set the token from OPENCLAW_GATEWAY environment variable
    token: token,
    timeout: 30000,
    reconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });
  
  if (!token) {
    console.warn('WARNING: OPENCLAW_GATEWAY_TOKEN environment variable not set');
    console.warn('Using device authentication instead (requires pre-pairing)');
  }

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