import http from 'http';
import { SkillsStatusResult, SkillStatus } from './types';

interface Skill {
  skillKey: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  installedAt: number;
}

class OpenClawServer {
  private server: http.Server;
  private skills: Map<string, Skill> = new Map();

  constructor(private port: number = 8003) {
    this.server = http.createServer(this.handleRequest.bind(this));
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`OpenClaw HTTP Server started on port ${this.port}`);
    });

    this.server.on('error', (error) => {
      console.error('HTTP Server error:', error);
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method?.toLowerCase();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'options') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      const body = await this.parseRequestBody(req);
      const params = body;

      switch (path) {
        case '/connect':
          this.handleConnect(res);
          break;
        case '/skills/list':
          this.handleSkillsList(res);
          break;
        case '/skills/status':
          this.handleSkillsStatus(res, params);
          break;
        case '/skills/install':
          this.handleSkillsInstall(res, params);
          break;
        case '/skills/uninstall':
          this.handleSkillsUninstall(res, params);
          break;
        case '/skills/update':
          this.handleSkillsUpdate(res, params);
          break;
        case '/gateway/status':
          this.handleGatewayStatus(res);
          break;
        default:
          this.sendError(res, 'UNKNOWN_METHOD', `Path ${path} not supported`, 404);
      }
    } catch (error) {
      console.error('Error handling request:', error);
      this.sendError(res, 'INTERNAL_ERROR', 'Internal server error', 500);
    }
  }

  private parseRequestBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', reject);
    });
  }

  private handleConnect(res: http.ServerResponse): void {
    const response = {
      success: true,
      protocol: 3
    };

    res.writeHead(200);
    res.end(JSON.stringify(response));
  }

  private handleSkillsList(res: http.ServerResponse): void {
    const skillsList = Array.from(this.skills.values());

    res.writeHead(200);
    res.end(JSON.stringify(skillsList));
  }

  private handleSkillsStatus(res: http.ServerResponse, params?: Record<string, unknown>): void {
    const agentId = params?.agentId as string;
    
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

    res.writeHead(200);
    res.end(JSON.stringify(result));
  }

  private handleSkillsInstall(res: http.ServerResponse, params?: Record<string, unknown>): void {
    const skillKey = params?.skillKey as string;
    const version = params?.version as string || '1.0.0';

    if (!skillKey) {
      this.sendError(res, 'MISSING_PARAMS', 'skillKey is required', 400);
      return;
    }

    if (this.skills.has(skillKey)) {
      this.sendError(res, 'SKILL_ALREADY_INSTALLED', `Skill ${skillKey} is already installed`, 409);
      return;
    }

    const newSkill: Skill = {
      skillKey,
      name: skillKey.charAt(0).toUpperCase() + skillKey.slice(1).replace('-', ' '),
      description: `Skill for ${skillKey}`,
      version,
      enabled: true,
      installedAt: Date.now()
    };

    this.skills.set(skillKey, newSkill);

    const response = {
      success: true,
      skill: newSkill
    };

    res.writeHead(201);
    res.end(JSON.stringify(response));
  }

  private handleSkillsUninstall(res: http.ServerResponse, params?: Record<string, unknown>): void {
    const skillKey = params?.skillKey as string;

    if (!skillKey) {
      this.sendError(res, 'MISSING_PARAMS', 'skillKey is required', 400);
      return;
    }

    if (!this.skills.has(skillKey)) {
      this.sendError(res, 'SKILL_NOT_FOUND', `Skill ${skillKey} not found`, 404);
      return;
    }

    this.skills.delete(skillKey);

    const response = {
      success: true,
      message: `Skill ${skillKey} uninstalled successfully`
    };

    res.writeHead(200);
    res.end(JSON.stringify(response));
  }

  private handleSkillsUpdate(res: http.ServerResponse, params?: Record<string, unknown>): void {
    const skillKey = params?.skillKey as string;
    const enabled = params?.enabled as boolean;

    if (!skillKey) {
      this.sendError(res, 'MISSING_PARAMS', 'skillKey is required', 400);
      return;
    }

    const skill = this.skills.get(skillKey);
    if (!skill) {
      this.sendError(res, 'SKILL_NOT_FOUND', `Skill ${skillKey} not found`, 404);
      return;
    }

    if (enabled !== undefined) {
      skill.enabled = enabled;
    }

    this.skills.set(skillKey, skill);

    const response = {
      success: true,
      skill
    };

    res.writeHead(200);
    res.end(JSON.stringify(response));
  }

  private handleGatewayStatus(res: http.ServerResponse): void {
    const response = {
      status: 'ok',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: Date.now()
    };

    res.writeHead(200);
    res.end(JSON.stringify(response));
  }

  private sendError(res: http.ServerResponse, code: string, message: string, statusCode: number = 400): void {
    const errorResponse = {
      error: {
        code,
        message
      }
    };

    res.writeHead(statusCode);
    res.end(JSON.stringify(errorResponse));
  }

  public close(): void {
    this.server.close();
    console.log('OpenClaw HTTP Server closed');
  }
}

export { OpenClawServer };

if (require.main === module) {
  const server = new OpenClawServer();

  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}
