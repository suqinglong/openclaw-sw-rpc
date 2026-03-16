const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:18789/ws');

ws.on('open', () => {
  console.log('WebSocket connected');
  
  // Send connect request with only token auth (no device)
  const connectMessage = {
    type: 'req',
    id: 'test-1',
    method: 'connect',
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'gateway-client',
        displayName: 'Test Client',
        version: '1.0.0',
        platform: 'darwin',
        deviceFamily: 'darwin',
        mode: 'backend',
      },
      auth: {
        token: '2f3db15ba40e9bf8000fece7c2874ad427d031327b9a19aa037852d68d7ad93f'
      },
      caps: [],
      role: 'operator',
      scopes: ['operator.admin'],
    },
  };
  
  console.log('Sending:', JSON.stringify(connectMessage, null, 2));
  ws.send(JSON.stringify(connectMessage));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
  ws.close();
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log('WebSocket closed:', code, reason.toString());
});
