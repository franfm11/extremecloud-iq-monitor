# ExtremeCloud IQ Monitor

A comprehensive **real-time network availability monitoring dashboard** built with React, Node.js, and tRPC. Monitor device uptime, detect outages, track SLA compliance, and generate detailed availability reports.

![ExtremeCloud IQ Monitor](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)
![React](https://img.shields.io/badge/React-19-blue)

---

## 🎯 Features

### Core Monitoring
- **Real-time Device Monitoring** - Track device status (Online/Offline/Unknown) with live updates
- **Multi-period Availability Reports** - 5m, 1h, 24h, 7d, 30d analytics
- **Uptime Calculation** - Accurate uptime percentage with configurable SLA targets
- **Outage Detection** - Automatic detection and logging of device downtime events
- **Flapping Detection** - Identify unstable devices with rapid state changes

### Advanced Features
- **Planned Downtime Management** - Schedule maintenance windows (one-time or recurring)
- **API Error Tracking** - Distinguish between real outages and API errors
- **Fast Polling & Retries** - Exponential backoff strategy for reliability
- **Webhook Notifications** - Real-time alerts with HMAC verification
- **Report Export** - Download availability reports in PDF and CSV formats

### User Experience
- **Dark Mode Dashboard** - Professional dark theme with intuitive navigation
- **Device Overview** - Quick status view of all monitored devices
- **Detailed Analytics** - Comprehensive metrics and historical data
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Authentication** - Secure OAuth integration with Manus

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+ (ARM64 compatible for M1/M2/M3/M4 Macs)
- **pnpm** (or npm)
- **MySQL/MariaDB** 8.0+
- **Git**

### Installation

#### Option 1: Automated Script (Recommended)
```bash
# Download and run the installation script
bash INSTALL_SCRIPT.sh
```

#### Option 2: Manual Installation
```bash
# Clone the repository
git clone https://github.com/francisco.munar/extremecloud-iq-monitor.git
cd extremecloud-iq-monitor

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Setup database
pnpm db:push

# Build and start
pnpm build
pnpm start
```

### Configuration

Create a `.env.local` file:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/extremecloud_iq"

# JWT
JWT_SECRET="your_jwt_secret_here"

# OAuth (Manus)
VITE_APP_ID="your_app_id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"

# API Keys
BUILT_IN_FORGE_API_KEY="your_api_key"
BUILT_IN_FORGE_API_URL="https://api.manus.im"
```

### Access the Application

- **Development**: `http://localhost:5173` (frontend) + `http://localhost:3000` (backend)
- **Production**: `http://localhost:3000`

---

## 📋 Architecture

### Tech Stack

**Frontend:**
- React 19
- Tailwind CSS 4
- shadcn/ui components
- Wouter (routing)
- tRPC client

**Backend:**
- Express.js
- tRPC 11
- Drizzle ORM
- MySQL/MariaDB
- Node.js 20+

**Database:**
- MySQL/MariaDB (primary)
- Drizzle migrations

### Project Structure

```
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/trpc.ts       # tRPC client setup
│   │   └── App.tsx           # Main app component
│   └── index.html
├── server/                    # Express + tRPC backend
│   ├── routers/              # tRPC route definitions
│   ├── services/             # Business logic
│   ├── db.ts                 # Database queries
│   └── _core/                # Framework utilities
├── drizzle/                  # Database schema & migrations
├── shared/                   # Shared types & constants
└── package.json
```

---

## 📊 Key Modules

### Availability Module
Comprehensive monitoring of device availability with:
- Real-time status tracking
- Multi-period uptime calculations
- Outage history and analysis
- SLA compliance tracking
- Flapping detection

### Report Export
Generate and download availability reports:
- **PDF Export** - Formatted reports with metrics
- **CSV Export** - Data for spreadsheet analysis
- **Custom Periods** - 5m, 1h, 24h, 7d, 30d

### Webhook System
Real-time notifications:
- Device state changes
- Outage alerts
- SLA breaches
- HMAC-verified security

---

## 🔧 Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/routers/availability.export.test.ts

# Watch mode
pnpm test --watch
```

### Database Migrations

```bash
# Generate migration
pnpm db:generate

# Apply migrations
pnpm db:push

# View schema
pnpm db:studio
```

### Build for Production

```bash
# Build frontend and backend
pnpm build

# Start production server
NODE_ENV=production pnpm start
```

---

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for detailed Docker setup.

---

## 📦 Deployment

### VMware Fusion (MacBook Pro M4)

See [DEPLOYMENT_GUIDE_VMWARE_FUSION.md](./DEPLOYMENT_GUIDE_VMWARE_FUSION.md) for complete step-by-step guide.

**Quick summary:**
1. Create Ubuntu 22.04 LTS ARM64 VM
2. Run `INSTALL_SCRIPT.sh`
3. Configure `.env.local`
4. Start with `sudo systemctl start extremecloud-iq`

### Cloud Deployment

The application can be deployed to:
- **AWS** (EC2, RDS)
- **DigitalOcean** (Droplets)
- **Linode** (Akamai)
- **Heroku** (with buildpack)
- **Railway** (with Docker)

---

## 📈 Performance

- **Response Time**: < 100ms for most queries
- **Database Queries**: Optimized with indexes
- **Real-time Updates**: WebSocket support for live data
- **Scalability**: Horizontal scaling with load balancer

---

## 🔒 Security

- **OAuth 2.0** - Secure authentication via Manus
- **JWT Tokens** - Session management
- **HMAC Verification** - Webhook security
- **SQL Injection Prevention** - Parameterized queries with Drizzle
- **CORS Protection** - Configured for production
- **Environment Secrets** - Never committed to repository

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Verify MariaDB is running
sudo systemctl status mariadb

# Check connection string in .env.local
cat .env.local | grep DATABASE_URL
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 [PID]
```

### Node Modules Issues
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

See [DEPLOYMENT_GUIDE_VMWARE_FUSION.md](./DEPLOYMENT_GUIDE_VMWARE_FUSION.md#troubleshooting) for more troubleshooting.

---

## 📝 API Documentation

### tRPC Endpoints

**Availability Router:**
- `availability.getReport` - Get single period report
- `availability.getReports` - Get multiple period reports
- `availability.getRecentOutages` - Get recent outages
- `availability.getDevicesStats` - Get all devices stats
- `availability.exportReportPDF` - Export to PDF
- `availability.exportReportCSV` - Export to CSV

**Advanced Router:**
- `advanced.getFlappingEvents` - Get flapping detection data
- `advanced.getPlannedDowntime` - Get maintenance windows
- `advanced.createPlannedDowntime` - Schedule maintenance

---

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE_VMWARE_FUSION.md) - VMware Fusion setup
- [Docker Deployment](./DOCKER_DEPLOYMENT.md) - Docker & Docker Compose
- [Installation Script](./INSTALL_SCRIPT.sh) - Automated setup
- [API Analysis](./extremecloud_iq_api_analysis.md) - ExtremeCloud IQ API details

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👤 Author

**Francisco Munar**
- GitHub: [@francisco.munar](https://github.com/francisco.munar)
- Email: francisco.munar@gmail.com

---

## 🙏 Acknowledgments

- Built with [React](https://react.dev)
- Powered by [tRPC](https://trpc.io)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Database: [Drizzle ORM](https://orm.drizzle.team)
- Authentication: [Manus](https://manus.im)

---

## 📞 Support

For issues, questions, or suggestions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review [Deployment Guide](./DEPLOYMENT_GUIDE_VMWARE_FUSION.md)
3. Open an issue on GitHub
4. Contact support at https://help.manus.im

---

**Last Updated**: February 2, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
