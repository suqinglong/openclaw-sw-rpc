import crypto from 'crypto';
import { access, readFile, writeFile, mkdir, chmod } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

export interface DeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

export interface DeviceAuthPayloadParams {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string | null;
  nonce?: string | null;
  platform?: string | null;
  deviceFamily?: string | null;
}

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const spki = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' }) as Buffer;
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function fingerprintPublicKey(publicKeyPem: string): string {
  const raw = derivePublicKeyRaw(publicKeyPem);
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Non-throwing async existence check. */
async function fileExists(p: string): Promise<boolean> {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

/** Generate a new Ed25519 identity (async key generation). */
async function generateIdentity(): Promise<DeviceIdentity> {
  const { publicKey, privateKey } = await new Promise<crypto.KeyPairKeyObjectResult>(
    (resolve, reject) => {
      crypto.generateKeyPair('ed25519', {}, (err: Error | null, publicKey: crypto.KeyObject, privateKey: crypto.KeyObject) => {
        if (err) reject(err);
        else resolve({ publicKey, privateKey });
      });
    },
  );
  const publicKeyPem = (publicKey.export({ type: 'spki', format: 'pem' }) as Buffer).toString();
  const privateKeyPem = (privateKey.export({ type: 'pkcs8', format: 'pem' }) as Buffer).toString();
  return {
    deviceId: fingerprintPublicKey(publicKeyPem),
    publicKeyPem,
    privateKeyPem,
  };
}

/**
 * Load device identity from disk, or create and persist a new one.
 * The identity file is stored at `filePath` with mode 0o600.
 *
 * Fully async — no synchronous file I/O or crypto.
 */
export async function loadOrCreateDeviceIdentity(filePath: string): Promise<DeviceIdentity> {
  try {
    if (await fileExists(filePath)) {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (
        parsed?.version === 1 &&
        typeof parsed.deviceId === 'string' &&
        typeof parsed.publicKeyPem === 'string' &&
        typeof parsed.privateKeyPem === 'string'
      ) {
        const derivedId = fingerprintPublicKey(parsed.publicKeyPem);
        if (derivedId && derivedId !== parsed.deviceId) {
          const updated = { ...parsed, deviceId: derivedId };
          await writeFile(filePath, `${JSON.stringify(updated, null, 2)}\n`, { mode: 0o600 });
          return { deviceId: derivedId, publicKeyPem: parsed.publicKeyPem, privateKeyPem: parsed.privateKeyPem };
        }
        return { deviceId: parsed.deviceId, publicKeyPem: parsed.publicKeyPem, privateKeyPem: parsed.privateKeyPem };
      }
    }
  } catch {
    // fall through to create a new identity
  }

  const identity = await generateIdentity();
  const dir = path.dirname(filePath);
  if (!(await fileExists(dir))) await mkdir(dir, { recursive: true });
  const stored = { version: 1, ...identity, createdAtMs: Date.now() };
  await writeFile(filePath, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 });
  try { await chmod(filePath, 0o600); } catch { /* ignore */ }
  return identity;
}

/** Sign a string payload with the Ed25519 private key, returns base64url signature. */
export function signDevicePayload(privateKeyPem: string, payload: string): string {
  const key = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), key);
  const encoded = base64UrlEncode(signature);
  return encoded;
}

/** Encode the raw Ed25519 public key bytes (from PEM) as base64url. */
export function publicKeyRawBase64UrlFromPem(publicKeyPem: string): string {
  const raw = derivePublicKeyRaw(publicKeyPem);
  const encoded = base64UrlEncode(raw);
  return encoded;
}

function normalizeTrimmedMetadata(value?: string | null): string {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : '';
}

function toLowerAscii(input: string): string {
  return input.replace(/[A-Z]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 32));
}

function normalizeDeviceMetadataForAuth(value?: string | null): string {
  const trimmed = normalizeTrimmedMetadata(value);
  if (!trimmed) {
    return '';
  }
  return toLowerAscii(trimmed);
}

/** Build the canonical payload string that must be signed for device auth. */
export function buildDeviceAuthPayload(params: DeviceAuthPayloadParams): string {
  const version = 'v3';
  const scopes = params.scopes.join(',');
  const token = params.token ?? '';
  const platform = normalizeDeviceMetadataForAuth(params.platform);
  const deviceFamily = normalizeDeviceMetadataForAuth(params.deviceFamily);
  const nonce = params.nonce ?? '';
  
  const payload = [
    version,
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
    nonce,
    platform,
    deviceFamily,
  ].join('|');
  
  return payload;
}