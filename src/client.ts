import WebSocket from 'ws';
import type {
  GatewayMessage,
  GatewayClientOptions,
  PendingRequest,
  SkillsStatusResult,
  SkillsUpdateParams,
  CronJob,
  SessionInfo,
} from './types';

export class OpenClawGatewayClient {
  private ws: WebSocket | null = null;
  private port: number;
  private token?: string;
  private timeout: number;
  private reconnect: boolean;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private connected: boolean = false;
  private handshakeComplete: boolean = false;
  private messageId: number = 0;

  constructor(options: GatewayClientOptions) {
    this.port = options.port;
    this.token = options.token;
    this.timeout = options.timeout ?? 30000;
    this.reconnect = options.reconnect ?? true;
    this.reconnectInterval = options.reconnectInterval ?? 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
  }

  async connect(): Promise<void> {
    const wsUrl = `ws://localhost:${this.port}/ws`;
    console.log(`Connecting to OpenClaw Gateway at ${wsUrl}`);

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      let handshakeTimeout: NodeJS.Timeout | null = null;
      let challengeReceived = false;
      let settled = false;

      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        if (handshakeTimeout) {
          clearTimeout(handshakeTimeout);
        }
        resolve();
      };

      const rejectOnce = (error: Error) => {
        if (settled) return;
        settled = true;
        if (handshakeTimeout) {
          clearTimeout(handshakeTimeout);
        }
        reject(error);
      };

      const sendConnectHandshake = (challengeNonce: string) => {
        console.log('Sending connect handshake');
        const connectId = this.generateMessageId();
        const connectMessage: GatewayMessage = {
          type: 'req',
          id: connectId,
          method: 'connect',
          params: {
            minProtocol:3,
            maxProtocol: 3,
            client: {
              id: 'openclaw-ws-rpc',
              displayName: 'OpenClaw WS RPC Client',
              version: '1.0.0',
              platform: process.platform,
              mode: 'cli',
            },
            auth: this.token ? { token: this.token } : {},
            caps: [],
            role: 'operator',
            scopes: ['operator.admin'],
          },
        };

        if (this.ws) {
          this.ws.send(JSON.stringify(connectMessage));
        }

        const requestTimeout = setTimeout(() => {
          if (!this.handshakeComplete) {
            rejectOnce(new Error('Connect handshake timeout'));
            this.ws?.close();
          }
        }, this.timeout);

        this.pendingRequests.set(connectId, {
          resolve: () => {
            this.handshakeComplete = true;
            this.connected = true;
            this.reconnectAttempts = 0;
            console.log('Connected to OpenClaw Gateway');
            resolveOnce();
          },
          reject: (error) => {
            rejectOnce(error);
          },
          timeout: requestTimeout,
        });
      };

      const challengeTimeout = setTimeout(() => {
        if (!challengeReceived && !settled) {
          rejectOnce(new Error('Timed out waiting for connect.challenge'));
          this.ws?.close();
        }
      }, this.timeout);

      this.ws.on('open', () => {
        console.log('WebSocket connection opened');
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message: GatewayMessage = JSON.parse(data.toString());

          if (!challengeReceived && message.type === 'event' && message.event === 'connect.challenge') {
            challengeReceived = true;
            if (challengeTimeout) {
              clearTimeout(challengeTimeout);
            }
            const nonce = message.payload?.nonce as string | undefined;
            if (nonce) {
              sendConnectHandshake(nonce);
            }
            return;
          }

          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        console.log(`WebSocket closed (code=${code}, reason=${reason.toString()})`);
        this.connected = false;
        this.handshakeComplete = false;
        this.clearPendingRequests(new Error('Connection closed'));

        if (this.reconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Reconnecting in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => {
            this.connect().catch((error) => {
              console.error('Reconnect failed:', error);
            });
          }, this.reconnectInterval);
        }
      });

      this.ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        if (!this.handshakeComplete) {
          rejectOnce(error);
        }
      });
    });
  }

  disconnect(): void {
    this.reconnect = false;
    this.clearPendingRequests(new Error('Disconnected by client'));
    this.ws?.close();
    this.connected = false;
  }

  private generateMessageId(): string {
    return `msg-${++this.messageId}`;
  }

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to Gateway');
    }

    const messageId = this.generateMessageId();
    const message: GatewayMessage = {
      type: 'req',
      id: messageId,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Request timeout: ${method}`));
      }, this.timeout);

      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timeout,
      });

      if (this.ws) {
        this.ws.send(JSON.stringify(message));
      }
    });
  }

  private handleMessage(message: GatewayMessage): void {
    if (message.type === 'res' && message.id) {
      const request = this.pendingRequests.get(message.id);
      if (request) {
        clearTimeout(request.timeout);
        this.pendingRequests.delete(message.id);

        if (message.error) {
          request.reject(new Error(`${message.error.code}: ${message.error.message}`));
        } else {
          request.resolve(message.result);
        }
      }
    } else if (message.type === 'event') {
      console.log('Received event:', message.event, message.payload);
    }
  }

  private clearPendingRequests(error: Error): void {
    for (const [, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    this.pendingRequests.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async skillsStatus(agentId?: string): Promise<SkillsStatusResult> {
    const params = agentId ? { agentId } : undefined;
    return (await this.request('skills.status', params)) as SkillsStatusResult;
  }

  async skillsUpdate(params: SkillsUpdateParams): Promise<{ ok: boolean; skillKey: string; config: Record<string, unknown> }> {
    return (await this.request('skills.update', params as unknown as Record<string, unknown>)) as { ok: boolean; skillKey: string; config: Record<string, unknown> };
  }

  async cronList(): Promise<CronJob[]> {
    return (await this.request('cron.list')) as CronJob[];
  }

  async cronAdd(params: { name: string; schedule: string; prompt: string; session?: string }): Promise<{ ok: boolean }> {
    return (await this.request('cron.add', params)) as { ok: boolean };
  }

  async cronRemove(name: string): Promise<{ ok: boolean }> {
    return (await this.request('cron.remove', { name })) as { ok: boolean };
  }

  async sessions(): Promise<SessionInfo[]> {
    return (await this.request('sessions')) as SessionInfo[];
  }

  async gatewayStatus(): Promise<{ status: string; version?: string }> {
    return (await this.request('status')) as { status: string; version?: string };
  }
}