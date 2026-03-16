const WebSocket = require('ws');
const crypto = require('crypto');
const { buildDeviceAuthPayload, signDevicePayload, publicKeyRawBase64UrlFromPem, loadOrCreateDeviceIdentity } = require('./dist/device-identity');

async function test() {
  const ws = new WebSocket('ws://127.0.0.1:18789/ws');
  
  let challengeNonce = null;
  
  ws.on('open', () => {
    console.log('WebSocket connected');
    
    // Send connect request without token, wait for challenge
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
        auth: {},  // No token
        caps: [],
        role: 'operator',
        scopes: ['operator.admin'],
      },
    };
    
    console.log('Sending connect without token...');
    ws.send(JSON.stringify(connectMessage));
  });
  
  ws.on('message', async (data) => {
    const msg = JSON.parse(data.toString());
    console.log('Received:', msg);
    
    if (msg.event === 'connect.challenge') {
      challengeNonce = msg.payload.nonce;
      console.log('Got challenge nonce:', challengeNonce);
      
      // Now send connect with device signature
      const deviceIdentity = await loadOrCreateDeviceIdentity('./.openclaw-device-identity.json');
      const signedAtMs = Date.now();
      
      const payload = buildDeviceAuthPayload({
        deviceId: deviceIdentity.deviceId,
        clientId: 'gateway-client',
        clientMode: 'backend',
        role: 'operator',
        scopes: ['operator.admin'],
        signedAtMs: signedAtMs,
        token: undefined,  // No token in payload
        nonce: challengeNonce,
        platform: 'darwin',
        deviceFamily: 'darwin',
      });
      
      const signature = signDevicePayload(deviceIdentity.privateKeyPem, payload);
      const publicKey = publicKeyRawBase64UrlFromPem(deviceIdentity.publicKeyPem);
      
      const connectMessage = {
        type: 'req',
        id: 'test-2',
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
          auth: {},  // No token
          caps: [],
          role: 'operator',
          scopes: ['operator.admin'],
          device: {
            id: deviceIdentity.deviceId,
            publicKey: publicKey,
            signature: signature,
            signedAt: signedAtMs,
            nonce: challengeNonce,
          },
        },
      };
      
      console.log('Sending connect with device...');
      ws.send(JSON.stringify(connectMessage));
    } else if (msg.type === 'res' && msg.id === 'test-2') {
      console.log('Connect response:', msg);
      ws.close();
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  ws.on('close', (code, reason) => {
    console.log('WebSocket closed:', code, reason.toString());
  });
}

test().catch(console.error);
