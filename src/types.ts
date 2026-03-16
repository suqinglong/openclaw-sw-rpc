export interface GatewayMessage {
  type: 'req' | 'res' | 'event';
  id?: string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: GatewayError;
  event?: string;
  payload?: Record<string, unknown>;
}

export interface GatewayError {
  code: string;
  message: string;
}

export interface ConnectParams {
  minProtocol?: number;
  maxProtocol?: number;
  client: {
    id: string;
    displayName: string;
    version: string;
    platform: string;
    mode: string;
  };
  auth: {
    token?: string;
  };
  caps?: string[];
  role?: string;
  scopes?: string[];
  device?: DeviceInfo;
}

export interface DeviceInfo {
  id: string;
  publicKey: string;
  signature: string;
  signedAt: number;
  nonce: string;
}

export interface GatewayClientOptions {
  port: number;
  token?: string;
  timeout?: number;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export interface SkillsStatusResult {
  skills?: SkillStatus[];
}

export interface SkillStatus {
  skillKey: string;
  slug?: string;
  name?: string;
  description?: string;
  disabled?: boolean;
  emoji?: string;
  version?: string;
  author?: string;
  config?: Record<string, unknown>;
  bundled?: boolean;
  always?: boolean;
}

export interface SkillsUpdateParams {
  skillKey: string;
  enabled?: boolean;
  apiKey?: string;
  env?: Record<string, string>;
}

export interface CronJob {
  name: string;
  schedule: string;
  prompt: string;
  session?: string;
  enabled?: boolean;
}

export interface SessionInfo {
  key: string;
  agentId?: string;
  channel?: string;
  identifier?: string;
  createdAt?: number;
  lastActivityAt?: number;
}