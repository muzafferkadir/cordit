# Cordit

A lightweight, self-hosted Discord-like chat application with real-time messaging and voice chat support.

![Cordit Banner](https://img.shields.io/badge/Cordit-Chat%20%26%20Voice-purple?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Docker](https://img.shields.io/badge/docker-ready-blue?style=for-the-badge)

## ✨ Features

- **Real-time Messaging** - Instant chat with typing indicators
- **Voice Chat** - Built-in voice channels powered by LiveKit
- **Rooms/Channels** - Organize conversations in different rooms
- **User Authentication** - Secure JWT-based authentication
- **Invite System** - Admin-controlled invite codes for registration
- **Mobile Responsive** - Works great on desktop and mobile
- **Self-Hosted** - Full control over your data

## 🚀 Quick Start (Docker)

### Prerequisites

- Docker & Docker Compose
- Domain with DNS access (for production)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/cordit.git
cd cordit
```

### 2. Configure Environment

```bash
cp .env.sample .env
```

Edit `.env` with your settings:

```env
# Your domains
FRONTEND_URL=https://cordit.example.com
BACKEND_URL=https://api.cordit.example.com
LIVEKIT_URL=wss://livekit.cordit.example.com

# Security (CHANGE THESE!)
ACCESS_TOKEN_SECRET=your-super-secret-key-min-32-characters
ALLOWED_ORIGINS=https://cordit.example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

### 3. DNS Setup

Point these domains to your server:

| Domain | Type | Value |
|--------|------|-------|
| `cordit.example.com` | A | `YOUR_SERVER_IP` |
| `api.cordit.example.com` | A | `YOUR_SERVER_IP` |
| `livekit.cordit.example.com` | A | `YOUR_SERVER_IP` |

> **Tip**: Use a wildcard record `*.cordit.example.com` for simplicity

### 4. Deploy

```bash
docker compose up -d --build
```

### 5. Access

- **Frontend**: https://cordit.example.com
- **Backend API**: https://api.cordit.example.com

## 🔧 Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `FRONTEND_URL` | Public URL for the frontend | Required |
| `BACKEND_URL` | Public URL for the API | Required |
| `LIVEKIT_URL` | WebSocket URL for voice chat | Required |
| `ACCESS_TOKEN_SECRET` | JWT signing secret (min 32 chars) | Required |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `*` |
| `ADMIN_USERNAME` | Initial admin username | `admin` |
| `ADMIN_PASSWORD` | Initial admin password | `admin123` |
| `INVITE_CODE_EXPIRY_HOURS` | Invite code validity | `24` |
| `LIVEKIT_API_KEY` | LiveKit API key | `devkey` |
| `LIVEKIT_API_SECRET` | LiveKit API secret | `secret` |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Network                     │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│  │ Frontend │───▶│ Backend  │◀───│ LiveKit  │       │
│  │ (Next.js)│    │(Express) │    │ (Voice)  │       │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘       │
│       │               │               │              │
│       │          ┌────▼─────┐         │              │
│       │          │ MongoDB  │         │              │
│       │          └──────────┘         │              │
└───────┼───────────────────────────────┼──────────────┘
        ▼                               ▼
   cordit.com                  livekit.cordit.com
   api.cordit.com
```

## 💻 Local Development

### Backend

```bash
cd backend
cp .env.sample .env
yarn install
yarn dev
```

### Frontend

```bash
cd frontend
yarn install
yarn dev
```

### Requirements

- Node.js 20+
- MongoDB (local or Docker)
- LiveKit server (optional, for voice)

## 📁 Project Structure

```
cordit/
├── backend/               # Express.js API
│   ├── src/
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # API routes
│   │   ├── middlewares/  # Auth, error handling
│   │   ├── utils/        # Socket.io, helpers
│   │   └── validators/   # Request validation
│   └── Dockerfile
├── frontend/              # Next.js application
│   ├── app/              # Pages and routes
│   ├── components/       # React components
│   ├── lib/              # API client, store
│   └── Dockerfile
├── docker-compose.yml     # Production deployment
├── .env.sample           # Environment template
└── README.md
```

## 🚢 Deployment Platforms

### Dokploy

1. Create new Compose project
2. Connect your repository
3. Set environment variables
4. Configure domains for each service:
   - `frontend` → cordit.example.com (port 3000)
   - `backend` → api.cordit.example.com (port 3000)
   - `livekit` → livekit.cordit.example.com (port 7880)
5. Enable HTTPS and WebSocket support for LiveKit

### Coolify / Portainer

Similar process - import docker-compose.yml and configure domains per service.

### VPS with Traefik/Nginx

Add reverse proxy labels or configuration for each service subdomain.

## 🔒 Security Notes

1. **JWT Secret** - `ACCESS_TOKEN_SECRET` must be at least 32 characters
2. **Change admin password** - Update `ADMIN_PASSWORD` immediately
3. **Configure CORS** - Set `ALLOWED_ORIGINS` to your frontend domain in production
4. **Use HTTPS** - Always deploy behind SSL/TLS
5. **Rate Limiting** - Built-in protection against brute-force attacks
6. **LiveKit DNS-only** - If using Cloudflare, set LiveKit subdomain to "DNS only" (not proxied) for WebSocket compatibility

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [LiveKit](https://livekit.io/) - Real-time voice/video infrastructure
- [Socket.io](https://socket.io/) - Real-time messaging
- [Next.js](https://nextjs.org/) - React framework
- [Express.js](https://expressjs.com/) - Node.js web framework
