# WisdomVault 服务器部署指南

## 一、服务器推荐（国内）

### 推荐方案对比

#### 1. **腾讯云轻量应用服务器**（最推荐 ⭐⭐⭐⭐⭐）

**优势：**

- 价格便宜，新用户首年 24-60 元/月
- 自带应用镜像（WordPress、Node.js 等），可快速部署
- 带宽充足（6-8Mbps），适合个人项目
- 管理界面简单，维护便捷
- 国内访问速度快

**推荐配置：**

- **入门级**：2 核 2G，40GB SSD，6Mbps，约 **24 元/月**（新用户首年）
- **推荐级**：2 核 4G，60GB SSD，8Mbps，约 **60 元/月**（新用户首年）
- **性能级**：4 核 8G，80GB SSD，10Mbps，约 **120 元/月**

**购买链接：** <https://cloud.tencent.com/act/pro/lighthouse>

**适用场景：** 个人使用、小团队、预算有限

---

#### 2. **阿里云轻量应用服务器**（推荐 ⭐⭐⭐⭐）

**优势：**

- 价格适中，新用户有优惠
- 稳定性好，适合生产环境
- 带宽充足
- 有丰富的应用镜像

**推荐配置：**

- **入门级**：2 核 2G，40GB SSD，5Mbps，约 **24 元/月**（新用户）
- **推荐级**：2 核 4G，60GB SSD，6Mbps，约 **60 元/月**（新用户）

**购买链接：** <https://www.aliyun.com/product/swas>

**适用场景：** 需要更高稳定性，预算稍高

---

#### 3. **华为云云耀云服务器**（推荐 ⭐⭐⭐⭐）

**优势：**

- 性价比高
- 适合企业用户
- 有丰富的应用市场

**推荐配置：**

- **入门级**：2 核 2G，40GB SSD，5Mbps，约 **30 元/月**

**适用场景：** 企业用户、需要更多技术支持

---

### 最终推荐

**首选：腾讯云轻量应用服务器 2 核 4G 配置**

- 价格：新用户首年约 60 元/月，续费约 120 元/月
- 性能：足够运行 RAG 系统
- 维护：简单便捷，有可视化控制台
- 带宽：8Mbps 足够个人使用

---

## 二、快速部署流程

### 步骤 1：购买并初始化服务器

1. **购买腾讯云轻量应用服务器**

   - 选择：2 核 4G，60GB SSD，8Mbps
   - 地域：选择离你最近的（如：北京、上海、广州）
   - 镜像：选择 **Ubuntu 22.04 LTS** 或 **CentOS 7.9**
   - 设置 root 密码并记录

2. **配置安全组**

   - 开放端口：22 (SSH)、80 (HTTP)、443 (HTTPS)
   - 在控制台 → 防火墙 → 添加规则

3. **连接服务器**

   ```bash
   ssh root@你的服务器IP
   ```

---

### 步骤 2：一键安装基础环境

在服务器上执行以下命令（复制粘贴即可）：

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Python 3.9+ 和 pip
apt install -y python3.9 python3.9-venv python3-pip python3.9-dev

# 安装 Node.js 18+ (使用 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 Nginx
apt install -y nginx

# 安装 Supervisor (进程管理)
apt install -y supervisor

# 安装 Git
apt install -y git

# 安装 Certbot (SSL 证书)
apt install -y certbot python3-certbot-nginx

# 配置防火墙
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

### 步骤 3：部署项目代码

#### 方式 A：使用 Git（推荐）

```bash
# 创建项目目录
mkdir -p /var/www/wisdomvault
cd /var/www/wisdomvault

# 克隆项目（替换为你的仓库地址）
git clone https://github.com/yourusername/wisdomvault.git .

# 或者如果使用私有仓库，需要先配置 SSH key
```

#### 方式 B：使用 SCP 上传（如果代码在本地）

在**本地电脑**执行：

```bash
# 打包项目（排除 node_modules 和 venv）
cd /path/to/personal_kb_project
tar --exclude='node_modules' --exclude='venv' --exclude='.git' \
    -czf wisdomvault.tar.gz .

# 上传到服务器
scp wisdomvault.tar.gz root@你的服务器IP:/var/www/

# 在服务器上解压
ssh root@你的服务器IP
cd /var/www
tar -xzf wisdomvault.tar.gz -C wisdomvault
```

---

### 步骤 4：配置后端

```bash
cd /var/www/wisdomvault/backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 创建必要的目录
mkdir -p uploads/pdfs
mkdir -p vector_store

# 创建 .env 文件
cat > .env << 'EOF'
# OpenAI 配置
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Google OAuth 配置（需要更新为你的域名）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# JWT 配置（生成强随机密钥）
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# LangSmith 配置（可选）
LANGCHAIN_API_KEY=
LANGCHAIN_TRACING_V2=false
LANGCHAIN_PROJECT=wisdomvault-rag
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
EOF

# 编辑 .env 文件，填入真实的配置
nano .env

# 初始化数据库（使用项目自带的脚本）
python3 init_db.py

# 初始化评估功能（可选）
python3 migrate_evaluation.py
```

**重要：** 编辑 `.env` 文件，填入：

- 你的 OpenAI API Key
- Google OAuth 凭据（需要在 Google Cloud Console 配置生产域名）
- 生成的 JWT Secret Key

---

### 步骤 5：配置前端

```bash
cd /var/www/wisdomvault/frontend

# 安装依赖
pnpm install

# 修改 API 地址（使用环境变量或直接修改）
# 编辑 src/api.ts，将 API_BASE_URL 改为你的域名
# 例如：const API_BASE_URL = "https://api.yourdomain.com";

# 构建生产版本
pnpm run build
```

**修改 API 地址：**

编辑 `frontend/src/api.ts`：

```typescript
// 生产环境
const API_BASE_URL =
  process.env.VITE_API_BASE_URL || "https://api.yourdomain.com";
```

或者使用环境变量：

```bash
# 创建 .env.production
echo "VITE_API_BASE_URL=https://api.yourdomain.com" > .env.production

# 重新构建
pnpm run build
```

---

### 步骤 6：配置 Supervisor（进程管理）

```bash
# 创建日志目录
mkdir -p /var/log/wisdomvault

# 创建 Supervisor 配置
cat > /etc/supervisor/conf.d/wisdomvault-backend.conf << 'EOF'
[program:wisdomvault-backend]
command=/var/www/wisdomvault/backend/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000 --workers 2
directory=/var/www/wisdomvault/backend
user=root
autostart=true
autorestart=true
stderr_logfile=/var/log/wisdomvault/backend_error.log
stdout_logfile=/var/log/wisdomvault/backend_access.log
environment=PATH="/var/www/wisdomvault/backend/venv/bin"
EOF

# 重新加载 Supervisor
supervisorctl reread
supervisorctl update
supervisorctl start wisdomvault-backend

# 查看状态
supervisorctl status wisdomvault-backend
```

---

### 步骤 7：配置 Nginx

```bash
# 创建 Nginx 配置
cat > /etc/nginx/sites-available/wisdomvault << 'EOF'
# 前端静态文件
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/wisdomvault/frontend/dist;
    index index.html;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location ~ ^/(auth|query|docs|conversations|knowledge-bases|evaluation|upload-pdf|extract-web|tasks|highlights|search-history) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 替换域名（将 yourdomain.com 替换为你的实际域名）
sed -i 's/yourdomain.com/你的域名/g' /etc/nginx/sites-available/wisdomvault

# 启用配置
ln -s /etc/nginx/sites-available/wisdomvault /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

---

### 步骤 8：配置 SSL 证书（HTTPS）

```bash
# 获取 SSL 证书（Let's Encrypt 免费）
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 按照提示输入邮箱等信息
# Certbot 会自动配置 Nginx

# 测试自动续期
certbot renew --dry-run
```

---

### 步骤 9：配置 Google OAuth（重要）

1. **访问 Google Cloud Console**

   - <https://console.cloud.google.com/>

2. **更新 OAuth 配置**

   - 进入：API 和凭据 → OAuth 2.0 客户端 ID
   - 编辑你的客户端 ID
   - 添加授权重定向 URI：`https://yourdomain.com/auth/google/callback`
   - 保存

3. **更新服务器上的 .env 文件**

   ```bash
   nano /var/www/wisdomvault/backend/.env
   # 更新 GOOGLE_REDIRECT_URI
   ```

4. **重启后端服务**

   ```bash
   supervisorctl restart wisdomvault-backend
   ```

---

## 三、数据迁移（如果有本地数据）

### 备份本地数据

在**本地电脑**执行：

```bash
# 备份数据库
scp /path/to/backend/kb.db root@服务器IP:/tmp/kb_backup.db

# 备份向量数据库
tar -czf vector_store_backup.tar.gz /path/to/backend/vector_store
scp vector_store_backup.tar.gz root@服务器IP:/tmp/

# 备份上传文件
tar -czf uploads_backup.tar.gz /path/to/backend/uploads
scp uploads_backup.tar.gz root@服务器IP:/tmp/
```

### 恢复数据到服务器

在**服务器**上执行：

```bash
# 停止服务
supervisorctl stop wisdomvault-backend

# 恢复数据库
cp /tmp/kb_backup.db /var/www/wisdomvault/backend/kb.db

# 恢复向量数据库
cd /var/www/wisdomvault/backend
tar -xzf /tmp/vector_store_backup.tar.gz

# 恢复上传文件
tar -xzf /tmp/uploads_backup.tar.gz

# 启动服务
supervisorctl start wisdomvault-backend
```

---

## 四、日常维护

### 查看日志

```bash
# 后端日志
tail -f /var/log/wisdomvault/backend_access.log
tail -f /var/log/wisdomvault/backend_error.log

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 重启服务

```bash
# 重启后端
supervisorctl restart wisdomvault-backend

# 重启 Nginx
systemctl restart nginx

# 查看服务状态
supervisorctl status
systemctl status nginx
```

### 更新代码

```bash
cd /var/www/wisdomvault

# 拉取最新代码
git pull

# 更新后端依赖（如果有变化）
cd backend
source venv/bin/activate
pip install -r requirements.txt

# 运行数据库迁移（如果有）
python3 init_db.py
python3 migrate_evaluation.py

# 重启后端
supervisorctl restart wisdomvault-backend

# 更新前端
cd ../frontend
pnpm install
pnpm run build

# 重启 Nginx（通常不需要）
systemctl reload nginx
```

### 自动备份脚本

创建备份脚本 `/var/www/wisdomvault/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/wisdomvault"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
cp /var/www/wisdomvault/backend/kb.db $BACKUP_DIR/kb_$DATE.db

# 备份向量数据库
tar -czf $BACKUP_DIR/vector_store_$DATE.tar.gz -C /var/www/wisdomvault/backend vector_store

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /var/www/wisdomvault/backend uploads

# 删除 7 天前的备份
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

设置可执行并添加到定时任务：

```bash
chmod +x /var/www/wisdomvault/backup.sh

# 添加到 crontab（每天凌晨 2 点备份）
crontab -e
# 添加：
0 2 * * * /var/www/wisdomvault/backup.sh >> /var/log/wisdomvault/backup.log 2>&1
```

---

## 五、性能优化（可选）

### 使用 Gunicorn（提升性能）

```bash
cd /var/www/wisdomvault/backend
source venv/bin/activate
pip install gunicorn

# 修改 Supervisor 配置
nano /etc/supervisor/conf.d/wisdomvault-backend.conf
# 将 command 改为：
# command=/var/www/wisdomvault/backend/venv/bin/gunicorn app:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

supervisorctl reread
supervisorctl update
supervisorctl restart wisdomvault-backend
```

### 启用 Nginx 缓存（可选）

在 Nginx 配置中添加：

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

server {
    # ... 其他配置

    location ~ ^/(query|docs|conversations) {
        proxy_cache api_cache;
        proxy_cache_valid 200 5m;
        # ... 其他 proxy 配置
    }
}
```

---

## 六、故障排查

### 后端无法启动

```bash
# 查看错误日志
tail -50 /var/log/wisdomvault/backend_error.log

# 检查环境变量
cd /var/www/wisdomvault/backend
source venv/bin/activate
python3 -c "from config import *; print('Config OK')"

# 手动测试启动
uvicorn app:app --host 0.0.0.0 --port 8000
```

### 前端无法访问

```bash
# 检查 Nginx 配置
nginx -t

# 检查文件权限
ls -la /var/www/wisdomvault/frontend/dist

# 检查 Nginx 错误日志
tail -50 /var/log/nginx/error.log
```

### OAuth 登录失败

1. 检查 Google OAuth 配置中的回调 URL
2. 检查服务器上的 `.env` 文件中的 `GOOGLE_REDIRECT_URI`
3. 确保域名已配置 SSL 证书（HTTPS）

### 向量检索慢

```bash
# 检查磁盘空间
df -h

# 检查向量数据库文件权限
ls -la /var/www/wisdomvault/backend/vector_store

# 检查内存使用
free -h
```

---

## 七、费用估算

### 腾讯云轻量应用服务器（推荐配置）

- **服务器**：2 核 4G，60GB SSD，8Mbps

  - 新用户首年：约 **60 元/月**（720 元/年）
  - 续费：约 **120 元/月**（1440 元/年）

- **域名**（可选）：

  - .com 域名：约 **55-70 元/年**
  - .cn 域名：约 **30-50 元/年**

- **SSL 证书**：免费（Let's Encrypt）

- **其他费用**：
  - OpenAI API：按使用量计费（约 0.002-0.01 元/次查询）
  - Google OAuth：免费

**总计（首年）**：约 **800-900 元/年**（包含域名）

---

## 八、安全检查清单

部署前检查：

- [ ] 已更新所有环境变量为生产值
- [ ] 已生成强随机 JWT Secret Key
- [ ] 已配置 Google OAuth 生产域名
- [ ] 已启用 HTTPS（SSL 证书）
- [ ] 已配置防火墙规则
- [ ] 已设置文件权限（敏感文件不可公开访问）
- [ ] 已配置自动备份
- [ ] 已测试所有功能正常

---

## 九、快速命令参考

```bash
# 查看后端状态
supervisorctl status wisdomvault-backend

# 重启后端
supervisorctl restart wisdomvault-backend

# 查看后端日志
tail -f /var/log/wisdomvault/backend_access.log

# 重启 Nginx
systemctl restart nginx

# 查看 Nginx 状态
systemctl status nginx

# 测试 Nginx 配置
nginx -t

# 更新 SSL 证书
certbot renew

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看进程
ps aux | grep uvicorn
```

---

## 十、技术支持

如遇问题，可以：

1. 查看日志文件定位问题
2. 检查配置文件是否正确
3. 确认服务是否正常运行
4. 参考项目 README.md 中的说明

---

**部署完成后，访问你的域名即可使用 WisdomVault！** 🎉
