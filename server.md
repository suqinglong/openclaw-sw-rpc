# OpenClaw HTTP 服务器使用指南

## 服务器概述

`src/server.ts` 是一个基于 HTTP 的 OpenClaw 网关服务器，提供技能管理功能。服务器默认运行在端口 8003 上，支持以下操作：

- 连接管理
- 技能列表查询
- 技能状态查询
- 技能安装
- 技能卸载
- 技能更新
- 网关状态查询

## 运行服务器

### 1. 构建项目

```bash
cd /Users/soda/work/loop-project/loopdata/loop-openclaw/openclaw-ws-rpc
npm run build
```

### 2. 启动服务器

```bash
node dist/server.js
```

服务器会在端口 8003 上启动，并输出：
```
OpenClaw HTTP Server started on port 8003
```

## API 方法

服务器使用 RESTful HTTP API，所有请求和响应都使用 JSON 格式。

### 请求格式

```bash
POST /endpoint HTTP/1.1
Host: localhost:8003
Content-Type: application/json

{
  "param1": "value1",
  "param2": "value2"
}
```

### 响应格式

#### 成功响应
```json
{
  "key": "value"
}
```

#### 错误响应
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

## 使用示例

### 1. 连接服务器

```bash
curl -X POST http://localhost:8003/connect \
  -H "Content-Type: application/json"
```

响应：
```json
{
  "success": true,
  "protocol": 3
}
```

### 2. 列出所有技能

```bash
curl -X POST http://localhost:8003/skills/list \
  -H "Content-Type: application/json"
```

响应：
```json
[
  {
    "skillKey": "test-skill",
    "name": "Test skill",
    "description": "Skill for test-skill",
    "version": "1.0.0",
    "enabled": true,
    "installedAt": 1678901234567
  }
]
```

### 3. 获取技能状态

```bash
curl -X POST http://localhost:8003/skills/status \
  -H "Content-Type: application/json" \
  -d '{"agentId": "optional-agent-id"}'
```

响应：
```json
{
  "skills": [
    {
      "skillKey": "test-skill",
      "name": "Test skill",
      "description": "Skill for test-skill",
      "disabled": false,
      "version": "1.0.0",
      "bundled": false
    }
  ]
}
```

### 4. 安装技能

```bash
curl -X POST http://localhost:8003/skills/install \
  -H "Content-Type: application/json" \
  -d '{"skillKey": "test-skill", "version": "1.0.0"}'
```

响应：
```json
{
  "success": true,
  "skill": {
    "skillKey": "test-skill",
    "name": "Test skill",
    "description": "Skill for test-skill",
    "version": "1.0.0",
    "enabled": true,
    "installedAt": 1678901234567
  }
}
```

### 5. 卸载技能

```bash
curl -X POST http://localhost:8003/skills/uninstall \
  -H "Content-Type: application/json" \
  -d '{"skillKey": "test-skill"}'
```

响应：
```json
{
  "success": true,
  "message": "Skill test-skill uninstalled successfully"
}
```

### 6. 更新技能

```bash
curl -X POST http://localhost:8003/skills/update \
  -H "Content-Type: application/json" \
  -d '{"skillKey": "test-skill", "enabled": false}'
```

响应：
```json
{
  "success": true,
  "skill": {
    "skillKey": "test-skill",
    "name": "Test skill",
    "description": "Skill for test-skill",
    "version": "1.0.0",
    "enabled": false,
    "installedAt": 1678901234567
  }
}
```

### 7. 获取网关状态

```bash
curl -X POST http://localhost:8003/gateway/status \
  -H "Content-Type: application/json"
```

响应：
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 123.456,
  "timestamp": 1678901234567
}
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/connect` | POST | 连接服务器 |
| `/skills/list` | POST | 列出所有技能 |
| `/skills/status` | POST | 获取技能状态 |
| `/skills/install` | POST | 安装技能 |
| `/skills/uninstall` | POST | 卸载技能 |
| `/skills/update` | POST | 更新技能 |
| `/gateway/status` | POST | 获取网关状态 |

## 错误代码

| HTTP 状态码 | 错误代码 | 描述 |
|------------|----------|------|
| 400 | MISSING_PARAMS | 缺少必要参数 |
| 404 | SKILL_NOT_FOUND | 技能未找到 |
| 404 | UNKNOWN_METHOD | 端点不支持 |
| 409 | SKILL_ALREADY_INSTALLED | 技能已安装 |
| 500 | INTERNAL_ERROR | 内部服务器错误 |

## 服务器配置

服务器默认运行在端口 8003 上，你可以通过构造函数参数修改端口：

```javascript
const server = new OpenClawServer(8080); // 运行在端口 8080
```

## CORS 支持

服务器默认启用 CORS，允许跨域请求：

```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

## 优雅关闭

服务器支持 SIGINT 信号处理，可以通过 Ctrl+C 优雅关闭：

```bash
^C
OpenClaw HTTP Server closed
```

## 注意事项

1. 服务器目前不支持认证机制
2. 技能数据存储在内存中，重启服务器后会丢失
3. 适用于开发和测试环境，生产环境需要添加持久化存储
4. 所有端点都支持 POST 请求，参数通过 JSON body 传递

## 完整测试脚本

创建一个 `test-server.js` 文件：

```javascript
import http from 'http';

const BASE_URL = 'http://localhost:8003';

function makeRequest(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 8003,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testServer() {
  console.log('Testing OpenClaw HTTP Server...\n');

  // 测试 1: 连接
  console.log('1. Testing connection...');
  const connect = await makeRequest('/connect');
  console.log('Response:', connect);

  // 测试 2: 获取技能列表
  console.log('\n2. Getting skills list...');
  const skillsList = await makeRequest('/skills/list');
  console.log('Response:', skillsList);

  // 测试 3: 安装技能
  console.log('\n3. Installing skill...');
  const install = await makeRequest('/skills/install', {
    skillKey: 'test-skill',
    version: '1.0.0'
  });
  console.log('Response:', install);

  // 测试 4: 获取技能状态
  console.log('\n4. Getting skills status...');
  const skillsStatus = await makeRequest('/skills/status');
  console.log('Response:', skillsStatus);

  // 测试 5: 更新技能
  console.log('\n5. Updating skill...');
  const update = await makeRequest('/skills/update', {
    skillKey: 'test-skill',
    enabled: false
  });
  console.log('Response:', update);

  // 测试 6: 获取网关状态
  console.log('\n6. Getting gateway status...');
  const gatewayStatus = await makeRequest('/gateway/status');
  console.log('Response:', gatewayStatus);

  // 测试 7: 卸载技能
  console.log('\n7. Uninstalling skill...');
  const uninstall = await makeRequest('/skills/uninstall', {
    skillKey: 'test-skill'
  });
  console.log('Response:', uninstall);

  console.log('\nAll tests completed!');
}

testServer().catch(console.error);
```

运行测试脚本：

```bash
node test-server.js
```

## 快速测试命令

```bash
# 连接测试
curl -X POST http://localhost:8003/connect

# 列出技能
curl -X POST http://localhost:8003/skills/list

# 安装技能
curl -X POST http://localhost:8003/skills/install -H "Content-Type: application/json" -d '{"skillKey":"test","version":"1.0.0"}'

# 更新技能
curl -X POST http://localhost:8003/skills/update -H "Content-Type: application/json" -d '{"skillKey":"test","enabled":false}'

# 卸载技能
curl -X POST http://localhost:8003/skills/uninstall -H "Content-Type: application/json" -d '{"skillKey":"test"}'

# 网关状态
curl -X POST http://localhost:8003/gateway/status
```

这将测试服务器的所有功能，并输出详细的请求和响应信息。