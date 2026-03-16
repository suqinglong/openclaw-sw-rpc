import WebSocket from 'ws';
import { GatewayMessage, SkillsStatusResult, SkillStatus, SkillsUpdateParams } from './types';

interface Skill {
  skillKey: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  installedAt: number;
}

class OpenClawServer {
  private wss: WebSocket.Server;
  private skills: Map<string, Skill> = new Map();
  private clients: WebSocket[] = [];

  constructor(private port: number = 8789) {
    this.wss = new WebSocket.Server({ port: this.port });
    this.setupEventListeners();
    // this.initializeDefaultSkills();
  }

  private setupEventListeners(): void {
    this.wss.on('connection', (ws) => {
      console.log('Client connected');
      this.clients.push(ws);

      ws.on('message', (message) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients = this.clients.filter(client => client !== ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log(`OpenClaw Server started on port ${this.port}`);
  }

  private initializeDefaultSkills(): void {
    // Add some default skills for testing
    this.skills.set('pdf', {
      skillKey: 'pdf',
      name: 'PDF Processing',
      description: 'Process and extract information from PDF files',
      version: '1.0.0',
      enabled: true,
      installedAt: Date.now()
    });

    this.skills.set('xlsx', {
      skillKey: 'xlsx',
      name: 'Excel Processing',
      description: 'Process and extract information from Excel files',
      version: '1.0.0',
      enabled: true,
      installedAt: Date.now()
    });

    this.skills.set('tavily-search', {
      skillKey: 'tavily-search',
      name: 'Tavily Search',
      description: 'Search the web using Tavily API',
      version: '1.0.0',
      enabled: false,
      installedAt: Date.now()
    });
  }

  private handleMessage(ws: WebSocket, message: WebSocket.RawData): void {
    try {
      const messageStr = typeof message === 'string' ? message : message.toString();
      const parsedMessage: GatewayMessage = JSON.parse(messageStr);

      if (parsedMessage.type === 'req' && parsedMessage.id && parsedMessage.method) {
        this.handleRequest(ws, parsedMessage);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      this.sendError(ws, 'INVALID_JSON', 'Failed to parse JSON message');
    }
  }

  private handleRequest(ws: WebSocket, message: GatewayMessage): void {
    const { id, method, params } = message;

    if (!id) {
      this.sendError(ws, 'MISSING_ID', 'Request ID is required');
      return;
    }

    switch (method) {
      case 'connect':
        this.handleConnect(ws, id);
        break;
      case 'skills.list':
        this.handleSkillsList(ws, id);
        break;
      case 'skills.status':
        this.handleSkillsStatus(ws, id, params);
        break;
      case 'skills.install':
        this.handleSkillsInstall(ws, id, params);
        break;
      case 'skills.uninstall':
        this.handleSkillsUninstall(ws, id, params);
        break;
      case 'skills.update':
        this.handleSkillsUpdate(ws, id, params);
        break;
      case 'gateway.status':
        this.handleGatewayStatus(ws, id);
        break;
      default:
        this.sendError(ws, 'UNKNOWN_METHOD', `Method ${method} not supported`);
    }
  }

  private handleConnect(ws: WebSocket, id: string): void {
    // Simple connect handling - no authentication for now
    const response: GatewayMessage = {
      type: 'res',
      id,
      result: {
        success: true,
        protocol: 3
      }
    };

    ws.send(JSON.stringify(response));
  }

  private handleSkillsList(ws: WebSocket, id: string): void {
    const skillsList = Array.from(this.skills.values());

    const response: GatewayMessage = {
      type: 'res',
      id,
      result: skillsList
    };

    ws.send(JSON.stringify(response));
  }

  private handleSkillsStatus(ws: WebSocket, id: string, params?: Record<string, unknown>): void {
    const agentId = params?.agentId as string;
    
    // For now, return all skills status regardless of agentId
    const skillsStatus: SkillStatus[] = Array.from(this.skills.values()).map(skill => ({
      skillKey: skill.skillKey,
      name: skill.name,
      description: skill.description,
      disabled: !skill.enabled,
      version: skill.version,
      bundled: false
    }));

    const result: SkillsStatusResult = {
      skills: skillsStatus
    };

    const response: GatewayMessage = {
      type: 'res',
      id,
      result
    };

    ws.send(JSON.stringify(response));
  }

  private handleSkillsInstall(ws: WebSocket, id: string, params?: Record<string, unknown>): void {
    const skillKey = params?.skillKey as string;
    const version = params?.version as string || '1.0.0';

    if (!skillKey) {
      this.sendError(ws, 'MISSING_PARAMS', 'skillKey is required');
      return;
    }

    if (this.skills.has(skillKey)) {
      this.sendError(ws, 'SKILL_ALREADY_INSTALLED', `Skill ${skillKey} is already installed`);
      return;
    }

    // Create a new skill
    const newSkill: Skill = {
      skillKey,
      name: skillKey.charAt(0).toUpperCase() + skillKey.slice(1).replace('-', ' '),
      description: `Skill for ${skillKey}`,
      version,
      enabled: true,
      installedAt: Date.now()
    };

    this.skills.set(skillKey, newSkill);

    const response: GatewayMessage = {
      type: 'res',
      id,
      result: {
        success: true,
        skill: newSkill
      }
    };

    ws.send(JSON.stringify(response));
  }

  private handleSkillsUninstall(ws: WebSocket, id: string, params?: Record<string, unknown>): void {
    const skillKey = params?.skillKey as string;

    if (!skillKey) {
      this.sendError(ws, 'MISSING_PARAMS', 'skillKey is required');
      return;
    }

    if (!this.skills.has(skillKey)) {
      this.sendError(ws, 'SKILL_NOT_FOUND', `Skill ${skillKey} not found`);
      return;
    }

    this.skills.delete(skillKey);

    const response: GatewayMessage = {
      type: 'res',
      id,
      result: {
        success: true,
        message: `Skill ${skillKey} uninstalled successfully`
      }
    };

    ws.send(JSON.stringify(response));
  }

  private handleSkillsUpdate(ws: WebSocket, id: string, params?: Record<string, unknown>): void {
    const skillKey = params?.skillKey as string;
    const enabled = params?.enabled as boolean;

    if (!skillKey) {
      this.sendError(ws, 'MISSING_PARAMS', 'skillKey is required');
      return;
    }

    const skill = this.skills.get(skillKey);
    if (!skill) {
      this.sendError(ws, 'SKILL_NOT_FOUND', `Skill ${skillKey} not found`);
      return;
    }

    // Update skill properties
    if (enabled !== undefined) {
      skill.enabled = enabled;
    }

    this.skills.set(skillKey, skill);

    const response: GatewayMessage = {
      type: 'res',
      id,
      result: {
        success: true,
        skill
      }
    };

    ws.send(JSON.stringify(response));
  }

  private handleGatewayStatus(ws: WebSocket, id: string): void {
    const response: GatewayMessage = {
      type: 'res',
      id,
      result: {
        status: 'ok',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: Date.now()
      }
    };

    ws.send(JSON.stringify(response));
  }

  private sendError(ws: WebSocket, code: string, message: string, id?: string): void {
    const errorResponse: GatewayMessage = {
      type: 'res',
      id: id,
      error: {
        code,
        message
      }
    };

    ws.send(JSON.stringify(errorResponse));
  }

  public close(): void {
    this.wss.close();
    console.log('OpenClaw Server closed');
  }
}

// Export the server class
export { OpenClawServer };

// If this file is run directly, start the server
if (require.main === module) {
  const server = new OpenClawServer();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}
