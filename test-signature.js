const crypto = require('crypto');
const { buildDeviceAuthPayload, signDevicePayload, publicKeyRawBase64UrlFromPem, loadOrCreateDeviceIdentity } = require('./dist/device-identity');

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function derivePublicKeyRaw(publicKeyPem) {
  const key = crypto.createPublicKey(publicKeyPem);
  const spki = key.export({ type: 'spki', format: 'der' });
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    Buffer.compare(spki.subarray(0, ED25519_SPKI_PREFIX.length), ED25519_SPKI_PREFIX) === 0
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function base64UrlDecode(input) {
  const normalized = input.replace(/\-/g, '+').replace(/\_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function verifyDeviceSignature(
  publicKey,
  payload,
  signatureBase64Url,
) {
  try {
    const key = publicKey.includes('BEGIN')
      ? crypto.createPublicKey(publicKey)
      : crypto.createPublicKey({
          key: Buffer.concat([ED25519_SPKI_PREFIX, base64UrlDecode(publicKey)]),
          type: 'spki',
          format: 'der',
        });
    const sig = (() => {
      try {
        return base64UrlDecode(signatureBase64Url);
      } catch {
        return Buffer.from(signatureBase64Url, 'base64');
      }
    })();
    return crypto.verify(null, Buffer.from(payload, 'utf8'), key, sig);
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}

async function testSignature() {
  console.log('Testing signature generation and verification...');
  
  // Load or create device identity
  const deviceIdentity = await loadOrCreateDeviceIdentity('./.openclaw-device-identity.json');
  console.log('Device ID:', deviceIdentity.deviceId);
  
  // Test payload parameters - matching the actual client
  const params = {
    deviceId: deviceIdentity.deviceId,
    clientId: 'gateway-client',
    clientMode: 'backend',
    role: 'operator',
    scopes: ['operator.admin'],
    signedAtMs: Date.now(),
    token: '2f3db15ba40e9bf8000fece7c2874ad427d031327b9a19aa037852d68d7ad93f',
    nonce: 'test-nonce-123',
    platform: 'darwin',
    deviceFamily: 'darwin',
  };
  
  // Build payload
  const payload = buildDeviceAuthPayload(params);
  console.log('Payload:', payload);
  
  // Sign payload
  const signature = signDevicePayload(deviceIdentity.privateKeyPem, payload);
  console.log('Signature:', signature);
  
  // Encode public key
  const publicKeyEncoded = publicKeyRawBase64UrlFromPem(deviceIdentity.publicKeyPem);
  console.log('Encoded public key:', publicKeyEncoded);
  
  // Verify signature
  const isValid = verifyDeviceSignature(publicKeyEncoded, payload, signature);
  console.log('Signature verification result:', isValid);
  
  // Also test with PEM public key
  const isValidPem = verifyDeviceSignature(deviceIdentity.publicKeyPem, payload, signature);
  console.log('Signature verification with PEM:', isValidPem);
  
  // Test device ID derivation
  function deriveDeviceIdFromPublicKey(publicKey) {
    try {
      const raw = publicKey.includes('BEGIN')
        ? derivePublicKeyRaw(publicKey)
        : base64UrlDecode(publicKey);
      return crypto.createHash('sha256').update(raw).digest('hex');
    } catch (error) {
      console.error('Device ID derivation error:', error);
      return null;
    }
  }
  
  const derivedIdFromEncoded = deriveDeviceIdFromPublicKey(publicKeyEncoded);
  console.log('Derived device ID from encoded public key:', derivedIdFromEncoded);
  console.log('Original device ID:', deviceIdentity.deviceId);
  console.log('Device ID match:', derivedIdFromEncoded === deviceIdentity.deviceId);
}

testSignature().catch(console.error);
