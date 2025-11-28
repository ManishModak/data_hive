# Running Multiple DataHive Workers on the Same Machine

**✅ Same IP is fully supported** - DataHive identifies devices by `DEVICE_ID`, not IP address.

You can run unlimited workers on a single machine as long as each has a unique `DEVICE_ID`.

---

## 🎯 Quick Start

### Method 1: PM2 Cluster Mode (Recommended)

This is the **easiest** and **most efficient** way to run multiple workers.

#### Step 1: Create Environment Files

```bash
# Device 1
cat > .env.device1 << EOF
DATAHIVE_JWT=your_jwt_token
DATAHIVE_DEVICE_ID=device-001
DATAHIVE_JOB_INTERVAL=60000
DATAHIVE_PING_INTERVAL=120000
EOF

# Device 2
cat > .env.device2 << EOF
DATAHIVE_JWT=your_jwt_token
DATAHIVE_DEVICE_ID=device-002
DATAHIVE_JOB_INTERVAL=60000
DATAHIVE_PING_INTERVAL=120000
EOF

# Device 3
cat > .env.device3 << EOF
DATAHIVE_JWT=your_jwt_token
DATAHIVE_DEVICE_ID=device-003
DATAHIVE_JOB_INTERVAL=60000
DATAHIVE_PING_INTERVAL=120000
EOF
```

#### Step 2: Create PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'datahive-worker-1',
      script: './datahive.js',
      env_file: '.env.device1',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '700M',
      error_file: './logs/worker1-error.log',
      out_file: './logs/worker1-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'datahive-worker-2',
      script: './datahive.js',
      env_file: '.env.device2',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '700M',
      error_file: './logs/worker2-error.log',
      out_file: './logs/worker2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'datahive-worker-3',
      script: './datahive.js',
      env_file: '.env.device3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '700M',
      error_file: './logs/worker3-error.log',
      out_file: './logs/worker3-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

#### Step 3: Start All Workers

```bash
# Start all workers
pm2 start ecosystem.config.js

# View status
pm2 status

# Monitor logs
pm2 logs

# Save for auto-restart on reboot
pm2 startup
pm2 save
```

#### Step 4: Manage Workers

```bash
# Restart all
pm2 restart all

# Restart specific worker
pm2 restart datahive-worker-1

# Stop all
pm2 stop all

# Delete all (stop and remove)
pm2 delete all

# Monitor resource usage
pm2 monit
```

---

## Method 2: Systemd Services (Linux)

For production Linux environments, use systemd to manage multiple workers.

### Step 1: Create Environment Files

Same as PM2 method - create `.env.device1`, `.env.device2`, etc.

### Step 2: Create Systemd Service Template

Create `/etc/systemd/system/datahive@.service`:

```ini
[Unit]
Description=DataHive Worker %i
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/data_hive
EnvironmentFile=/path/to/data_hive/.env.device%i
ExecStart=/usr/bin/node /path/to/data_hive/datahive.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource limits (optional)
MemoryMax=700M
CPUQuota=100%

[Install]
WantedBy=multi-user.target
```

### Step 3: Enable and Start Workers

```bash
# Enable services
sudo systemctl enable datahive@1
sudo systemctl enable datahive@2
sudo systemctl enable datahive@3

# Start services
sudo systemctl start datahive@1
sudo systemctl start datahive@2
sudo systemctl start datahive@3

# Check status
sudo systemctl status datahive@1
sudo systemctl status datahive@2
sudo systemctl status datahive@3
```

### Step 4: Manage Workers

```bash
# View logs
sudo journalctl -u datahive@1 -f
sudo journalctl -u datahive@2 -f

# Restart
sudo systemctl restart datahive@1

# Stop
sudo systemctl stop datahive@1

# Disable
sudo systemctl disable datahive@1
```

---

## Method 3: Docker Compose

For containerized environments, use Docker Compose.

### Step 1: Create `.env` Files

Same as above - create `.env.device1`, `.env.device2`, etc.

### Step 2: Create `docker-compose.yml`

```yaml
version: '3.8'

services:
  datahive-worker-1:
    build: .
    container_name: datahive-worker-1
    env_file:
      - .env.device1
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    mem_limit: 700m
    cpus: 1.0
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  datahive-worker-2:
    build: .
    container_name: datahive-worker-2
    env_file:
      - .env.device2
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    mem_limit: 700m
    cpus: 1.0
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  datahive-worker-3:
    build: .
    container_name: datahive-worker-3
    env_file:
      - .env.device3
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    mem_limit: 700m
    cpus: 1.0
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Step 3: Manage Containers

```bash
# Start all workers
docker-compose up -d

# View status
docker-compose ps

# View logs
docker-compose logs -f

# Restart all
docker-compose restart

# Stop all
docker-compose down

# Scale dynamically (if using generic setup)
docker-compose up -d --scale datahive-worker=5
```

---

## Method 4: Manual Processes (Development)

For testing or development, run workers manually in separate terminals.

```bash
# Terminal 1
DATAHIVE_JWT=your_jwt DATAHIVE_DEVICE_ID=device-001 node datahive.js

# Terminal 2
DATAHIVE_JWT=your_jwt DATAHIVE_DEVICE_ID=device-002 node datahive.js

# Terminal 3
DATAHIVE_JWT=your_jwt DATAHIVE_DEVICE_ID=device-003 node datahive.js
```

Or use tmux/screen for persistent sessions:

```bash
# Using tmux
tmux new -s worker1 -d "DATAHIVE_JWT=your_jwt DATAHIVE_DEVICE_ID=device-001 node datahive.js"
tmux new -s worker2 -d "DATAHIVE_JWT=your_jwt DATAHIVE_DEVICE_ID=device-002 node datahive.js"
tmux new -s worker3 -d "DATAHIVE_JWT=your_jwt DATAHIVE_DEVICE_ID=device-003 node datahive.js"

# Attach to session
tmux attach -t worker1
```

---

## 🎯 Resource Planning

### Memory Allocation

Each worker uses approximately **300-400MB** of RAM under normal load.

| Workers | Minimum RAM | Recommended RAM |
|---------|-------------|-----------------|
| 1       | 1 GB        | 2 GB            |
| 2       | 2 GB        | 3 GB            |
| 3       | 2 GB        | 4 GB            |
| 4       | 3 GB        | 5 GB            |
| 5       | 4 GB        | 6 GB            |

### CPU Allocation

- Each worker uses **~10-30% CPU** during active jobs
- Puppeteer (web scraping) is CPU-intensive
- Recommended: **1 vCPU per 2 workers**

### Optimal Configuration for Different VM Sizes

#### Azure B1s (1 vCPU, 1GB RAM)

```bash
# Maximum: 1-2 workers
# Recommended: 1 worker
pm2 start ecosystem.config.js --only datahive-worker-1
```

#### Azure B2s (2 vCPU, 4GB RAM)

```bash
# Maximum: 5-6 workers
# Recommended: 3-4 workers
pm2 start ecosystem.config.js
```

#### Azure D2s v3 (2 vCPU, 8GB RAM)

```bash
# Maximum: 8-10 workers
# Recommended: 6-8 workers
```

---

## 📊 Monitoring Multiple Workers

### PM2 Monitoring

```bash
# Real-time dashboard
pm2 monit

# List all processes
pm2 list

# Detailed info
pm2 show datahive-worker-1

# Save logs to file
pm2 logs --lines 100 > worker-logs.txt
```

### System Resource Monitoring

```bash
# Monitor total memory
free -h

# Monitor per-process
ps aux | grep datahive

# Monitor network connections
netstat -tuln | grep 443

# Monitor CPU usage
top -p $(pgrep -d',' -f datahive)
```

### Health Check Script

Create `check-workers.sh`:

```bash
#!/bin/bash

echo "=== DataHive Worker Health Check ==="
echo ""

# Check PM2 status
echo "PM2 Status:"
pm2 list

echo ""
echo "Memory Usage:"
free -h

echo ""
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)"

echo ""
echo "Datahive Processes:"
ps aux | grep datahive | grep -v grep

echo ""
echo "Log Files:"
tail -n 5 logs/worker1-out.log
tail -n 5 logs/worker2-out.log
tail -n 5 logs/worker3-out.log
```

Run with:

```bash
chmod +x check-workers.sh
./check-workers.sh
```

---

## 🔧 Configuration Best Practices

### 1. Stagger Job Intervals

Prevent all workers from hitting the API simultaneously:

```bash
# .env.device1
DATAHIVE_JOB_INTERVAL=60000    # 60s

# .env.device2
DATAHIVE_JOB_INTERVAL=65000    # 65s (5s offset)

# .env.device3
DATAHIVE_JOB_INTERVAL=70000    # 70s (10s offset)
```

### 2. Optimize for Low Memory

```bash
# Disable performance tracking to save ~50MB per worker
DATAHIVE_ENABLE_PERFORMANCE_TRACKING=false

# Limit concurrent jobs
DATAHIVE_MAX_CONCURRENT_JOBS=1

# Increase timeout for complex jobs
DATAHIVE_TIMEOUT=90000
```

### 3. Log Rotation

Configure PM2 log rotation:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 🚨 Troubleshooting

### Workers Compete for Jobs

**Problem**: Multiple workers picking up the same jobs.

**Solution**: The API automatically assigns jobs to specific devices. Each `DEVICE_ID` receives unique jobs.

### Memory Issues

**Problem**: System runs out of memory.

**Solution**:

```bash
# Add memory limits to PM2
pm2 start ecosystem.config.js --max-memory-restart 700M

# Or reduce number of workers
pm2 delete datahive-worker-3
```

### Port Conflicts

**Problem**: Not applicable - DataHive workers are clients, not servers. No ports needed.

### High CPU Usage

**Problem**: All workers using 100% CPU simultaneously.

**Solution**: Stagger job intervals (see Configuration Best Practices) or reduce `DATAHIVE_MAX_CONCURRENT_JOBS`.

---

## 📈 Scaling Recommendations

### Horizontal Scaling (Multiple Machines)

For maximum throughput, distribute workers across multiple machines:

- **Machine 1**: 3 workers (device-001, device-002, device-003)
- **Machine 2**: 3 workers (device-004, device-005, device-006)
- **Machine 3**: 3 workers (device-007, device-008, device-009)

### Vertical Scaling (Same Machine)

Increase resources on a single machine:

1. **Upgrade RAM**: Each 1GB allows ~2 additional workers
2. **Add vCPUs**: Each vCPU can handle ~2 workers efficiently
3. **Use SSD**: Faster disk I/O for Puppeteer cache

---

## ✅ Success Checklist

Your multi-worker setup is successful when:

- ✅ All workers start without errors
- ✅ Each worker has unique `DEVICE_ID`
- ✅ All workers ping successfully
- ✅ Workers process different jobs (no conflicts)
- ✅ Memory usage is stable
- ✅ Workers auto-restart on failure
- ✅ Logs show distinct device IDs

---

## 🎯 Example: 3 Workers Setup with PM2

**Complete step-by-step guide**:

```bash
# 1. Create environment files
cat > .env.device1 << EOF
DATAHIVE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATAHIVE_DEVICE_ID=laptop-worker-001
DATAHIVE_JOB_INTERVAL=60000
EOF

cat > .env.device2 << EOF
DATAHIVE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATAHIVE_DEVICE_ID=laptop-worker-002
DATAHIVE_JOB_INTERVAL=65000
EOF

cat > .env.device3 << EOF
DATAHIVE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATAHIVE_DEVICE_ID=laptop-worker-003
DATAHIVE_JOB_INTERVAL=70000
EOF

# 2. Copy the ecosystem.config.js from earlier in this doc

# 3. Start workers
pm2 start ecosystem.config.js

# 4. Verify
pm2 list
pm2 logs --lines 50

# 5. Enable auto-start on boot
pm2 startup
pm2 save

# 6. Monitor
pm2 monit
```

---

**🎉 You can now run unlimited DataHive workers on the same machine!**

Each worker is identified by `DEVICE_ID`, not IP address, so same-IP deployments are fully supported.
