# DataHive.js - Node.js Job Processor

**Enterprise-grade worker with 100% feature parity to Chrome extension**

[![Production Ready](https://img.shields.io/badge/production-ready-brightgreen.svg)](DEPLOYMENT.md)
[![Feature Parity](https://img.shields.io/badge/feature%20parity-100%25-blue.svg)](changelog.md)

---

## 🎯 Quick Start

### Prerequisites

```bash
# Node.js 18+ required
node --version
```

### Installation

```bash
npm install
```

### Configuration

Create `.env` file:

```bash
DATAHIVE_JWT=your_jwt_token
DATAHIVE_DEVICE_ID=your_device_id
```

### Run

```bash
# Development
node datahive.js

# Production (PM2)
pm2 start datahive.js --name datahive-worker
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for complete production setup.

---

## 🚀 Features

### Core Capabilities

- ✅ **Tool Registry System** - Modular architecture with 6 tools
- ✅ **Conditional Validation** - 11 comparison operators
- ✅ **Web Scraping** - Puppeteer with header interception
- ✅ **Performance Monitoring** - CPU/memory tracking per job
- ✅ **Dynamic Configuration** - Server-controlled settings

### Production Features

- Multiple deployment options (PM2, Systemd, Docker)
- Comprehensive error handling
- Health monitoring and logging
- 60+ automated tests
- Complete documentation

---

## 📁 Project Structure

```
data_hive/
├── src/                      # Modular source code
│   ├── tools/                # Tool registry + 6 tools
│   ├── ApiClient.js
│   ├── JobManager.js
│   ├── ConfigManager.js
│   ├── PerformanceMonitor.js
│   ├── Scraper.js
│   ├── logger.js
│   ├── config.js
│   └── index.js
├── tests/                    # 60+ tests
├── examples/                 # Demos
├── logs/                     # Log files
├── docs/                     # API reference
├── datahive.js               # Entry point (45 lines)
└── package.json
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Production deployment guide |
| [`docs/MULTI_DEVICE_SETUP.md`](docs/MULTI_DEVICE_SETUP.md) | Running multiple workers on same machine |
| [`changelog.md`](changelog.md) | Version history & changes |
| [`docs/TOOLS.md`](docs/TOOLS.md) | Tool API reference |
| [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) | Future enhancements |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Integration tests
npm run test:integration

# Demos
npm run demo          # Conditional gates
npm run demo:all      # Full tool system
npm run demo:phase2   # Performance & config
```

---

## 🔧 Available Tools

1. **ConditionalGateTool** - Data validation (11 operators)
2. **FetchTool** - HTTP requests
3. **OffscreenTool** - Web scraping with Puppeteer
4. **FetchAndExtractTool** - HTML parsing
5. **PerformanceMonitor** - Resource tracking
6. **ConfigManager** - Dynamic settings

See [`docs/TOOLS.md`](docs/TOOLS.md) for APIs.

---

## 📊 Status

- **Production Ready**: 98% ✅
- **Feature Parity**: 100% ✅
- **Test Coverage**: Comprehensive ✅
- **Documentation**: Complete ✅

---

## 📜 License

ISC

---

## 🆘 Support

For issues:

1. Check logs: `datahive.log` and `jobs.log`
2. Review [`DEPLOYMENT.md`](DEPLOYMENT.md)
3. Run demos to verify setup
4. Check system resources

---

**Ready for production deployment!** 🚀
