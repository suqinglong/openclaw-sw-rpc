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

### 基本用法 (basic-usage.ts)

```typescript
import { OpenClawGatewayClient } from './client';

async function main() {
  console.log('Connecting to OpenClaw Gateway...');
  
  const client = new OpenClawGatewayClient({
    host: '127.0.0.1',
    port: 18789,
    token: 'your-gateway-token-here',  // 与 Gateway 配置的 token 一致
    timeout: 30000,
    reconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  });

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
```

### 运行示例

```bash
npm run build
node dist/basic-usage.js
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

## 认证方式

客户端支持两种认证方式：

### 1. Token 认证（推荐）

在 OpenClaw Gateway 启动时设置 `OPENCLAW_GATEWAY_TOKEN` 环境变量：

```bash
export OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
```

然后在客户端配置中使用相同的 token：

```typescript
const client = new OpenClawGatewayClient({
  host: '127.0.0.1',
  port: 18789,
  token: 'your-gateway-token-here',  // 与 Gateway 配置的 token 一致
});
```

### 2. Device 认证

如果 Gateway 没有配置 token，可以使用设备认证。但设备需要预先通过 Gateway 的 Web UI 进行配对。

设备身份信息会自动生成并存储在 `.openclaw-device-identity.json` 文件中。

## 故障排除

### "gateway token mismatch" 错误

- 检查客户端配置的 token 是否与 Gateway 的 `OPENCLAW_GATEWAY_TOKEN` 环境变量一致
- 如果 Gateway 没有配置 token，客户端也不应该提供 token

### "device identity required" 或 "device signature invalid" 错误

- 设备需要通过 Gateway 的 Web UI 进行配对
- 访问 `http://localhost:18790`（Gateway 的 HTTP 端口）进行设备配对

### "NOT_PAIRED" 错误

- 设备尚未在 Gateway 中注册
- 需要先通过 Web UI 或其他已认证的客户端进行配对

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