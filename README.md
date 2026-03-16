# OpenClaw WebSocket RPC Client

一个用于与 OpenClaw Gateway 进行 WebSocket RPC 通信的 TypeScript 客户端库。

## 功能特性

- WebSocket 连接管理
- 自动重连机制
- 请求/响应匹配
- 类型安全的 API
- 支持 OpenClaw Gateway 的主要 RPC 方法

## 安装

```bash
npm install
```

## 构建

```bash
npm run build
```

## 使用示例

```typescript
import { OpenClawGatewayClient } from './client';

const client = new OpenClawGatewayClient({
  port: 3000,              // OpenClaw Gateway 端口
  token: 'your-token-here',  // 认证令牌（可选）
  timeout: 30000,            // 请求超时时间（毫秒）
  reconnect: true,            // 启用自动重连
  reconnectInterval: 5000,     // 重连间隔（毫秒）
  maxReconnectAttempts: 10,   // 最大重连尝试次数
});

await client.connect();
console.log('Connected to OpenClaw Gateway');

if (client.isConnected()) {
  const status = await client.gatewayStatus();
  console.log('Gateway status:', status);

  const skills = await client.skillsStatus();
  console.log('Skills status:', skills);

  const cronJobs = await client.cronList();
  console.log('Cron jobs:', cronJobs);

  const sessions = await client.sessions();
  console.log('Sessions:', sessions);

  await client.skillsUpdate({
    skillKey: 'example-skill',
    enabled: true,
  });
  console.log('Skill updated');

  await client.cronAdd({
    name: 'test-job',
    schedule: '0 10 * * *',
    prompt: 'Test cron job',
    session: 'isolated',
  });
  console.log('Cron job added');

  await client.cronRemove('test-job');
  console.log('Cron job removed');
}

client.disconnect();
```

## API 方法

### 连接管理

- `connect()`: 连接到 OpenClaw Gateway
- `disconnect()`: 断开连接
- `isConnected()`: 检查连接状态

### 技能管理

- `skillsStatus(agentId?: string)`: 获取技能状态
- `skillsUpdate(params: SkillsUpdateParams)`: 更新技能配置

### 定时任务管理

- `cronList()`: 获取所有定时任务
- `cronAdd(params)`: 添加新的定时任务
- `cronRemove(name: string)`: 删除定时任务

### 会话管理

- `sessions()`: 获取所有会话信息

### 网关状态

- `gatewayStatus()`: 获取网关状态

## 类型定义

```typescript
interface SkillsUpdateParams {
  skillKey: string;
  enabled?: boolean;
  apiKey?: string;
  env?: Record<string, string>;
}

interface CronJob {
  name: string;
  schedule: string;
  prompt: string;
  session?: string;
  enabled?: boolean;
}

interface SessionInfo {
  key: string;
  agentId?: string;
  channel?: string;
  identifier?: string;
  createdAt?: number;
  lastActivityAt?: number;
}
```

## 错误处理

客户端会自动处理连接错误和重连逻辑。如果请求失败，会抛出包含详细信息的错误：

```typescript
try {
  await client.skillsStatus();
} catch (error) {
  console.error('Failed to get skills status:', error);
}
```

## WebSocket 握手流程

1. 客户端连接到 `ws://localhost:{port}/ws`
2. 等待服务器发送 `connect.challenge` 事件
3. 客户端发送 `connect` 请求，包含认证信息
4. 服务器验证并建立连接

## 依赖

- `ws`: ^8.14.0
- `@types/node`: ^20.0.0
- `@types/ws`: ^8.5.0
- `typescript`: ^5.0.0

## 开发

```bash
# 监听模式编译
npm run watch

# 运行测试
npm run test
```