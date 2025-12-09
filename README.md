<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1FVEY90acP9lG8oJd_RkVbaYQRk6M6gjO

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 部署与路径

- 默认前端 `base` 为 `/`，适合用子域名（如 `extentwords.hiddow.xyz`）直接反代到 3000 端口。如需子路径部署可设置 `VITE_BASE_PATH=/extentwords/` 并重启前端。
- 默认允许域名 `extentwords.hiddow.xyz`，可用 `VITE_ALLOWED_HOSTS=domain1,domain2` 覆盖；如需自定义 API 地址，设置 `VITE_API_URL=http://your-api:3002`。

### Nginx 反代示例（子域名根路径）

```
server {
  listen 80;
  server_name extentwords.hiddow.xyz;

  location / {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## 后台管理脚本

使用 `scripts/manage.sh` 一键后台启动/停止/重启/查看状态/日志：

```
./scripts/manage.sh start
./scripts/manage.sh stop
./scripts/manage.sh restart
./scripts/manage.sh status
./scripts/manage.sh logs frontend
./scripts/manage.sh logs backend
```

可用环境变量覆盖端口/主机：`FRONT_HOST`(默认0.0.0.0)、`FRONT_PORT`(默认3000)、`BACK_PORT`(默认3002)；`VITE_BASE_PATH`、`VITE_API_URL` 等写入 `.env.local` 并重启前端生效。
