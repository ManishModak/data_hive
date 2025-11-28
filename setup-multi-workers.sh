#!/bin/bash

# Quick setup script for multiple DataHive workers
# This script helps you quickly create multiple worker configurations

echo "======================================"
echo "DataHive Multi-Worker Setup Script"
echo "======================================"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 is not installed. Installing now..."
    sudo npm install -g pm2
    echo "✅ PM2 installed successfully"
fi

# Ask for JWT token
echo "Please enter your DataHive JWT token:"
read -r JWT_TOKEN

if [ -z "$JWT_TOKEN" ]; then
    echo "❌ JWT token is required"
    exit 1
fi

# Ask for number of workers
echo ""
echo "How many workers do you want to run? (1-10)"
read -r NUM_WORKERS

# Validate number
if ! [[ "$NUM_WORKERS" =~ ^[0-9]+$ ]] || [ "$NUM_WORKERS" -lt 1 ] || [ "$NUM_WORKERS" -gt 10 ]; then
    echo "❌ Please enter a number between 1 and 10"
    exit 1
fi

echo ""
echo "Creating configuration for $NUM_WORKERS workers..."
echo ""

# Create .env files for each worker
for i in $(seq 1 "$NUM_WORKERS"); do
    DEVICE_ID="worker-$(hostname)-$(date +%s)-$i"
    JOB_INTERVAL=$((60000 + (i - 1) * 5000)) # Stagger by 5 seconds
    
    cat > ".env.device$i" << EOF
# DataHive Worker $i Configuration
# Generated on $(date)

DATAHIVE_JWT=$JWT_TOKEN
DATAHIVE_DEVICE_ID=$DEVICE_ID

# Job processing configuration
DATAHIVE_JOB_INTERVAL=$JOB_INTERVAL
DATAHIVE_PING_INTERVAL=120000
DATAHIVE_RELOAD_AFTER_JOBS=0
DATAHIVE_ENABLE_PERFORMANCE_TRACKING=true
DATAHIVE_MAX_CONCURRENT_JOBS=1
DATAHIVE_TIMEOUT=60000
EOF
    
    echo "✅ Created .env.device$i (Device ID: $DEVICE_ID)"
done

echo ""
echo "Creating PM2 ecosystem config..."

# Generate PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
EOF

for i in $(seq 1 "$NUM_WORKERS"); do
    cat >> ecosystem.config.js << EOF
    {
      name: 'datahive-worker-$i',
      script: './datahive.js',
      env_file: '.env.device$i',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '700M',
      error_file: './logs/worker$i-error.log',
      out_file: './logs/worker$i-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }$([ "$i" -ne "$NUM_WORKERS" ] && echo ",")
EOF
done

cat >> ecosystem.config.js << 'EOF'
  ]
};
EOF

echo "✅ Created ecosystem.config.js"
echo ""

# Create logs directory
mkdir -p logs

# Ask if user wants to start workers
echo "Configuration complete! Do you want to start the workers now? (y/n)"
read -r START_NOW

if [ "$START_NOW" = "y" ] || [ "$START_NOW" = "Y" ]; then
    echo ""
    echo "Starting workers..."
    pm2 start ecosystem.config.js
    
    echo ""
    echo "✅ Workers started successfully!"
    echo ""
    echo "Useful commands:"
    echo "  pm2 list          - View all workers"
    echo "  pm2 logs          - View logs"
    echo "  pm2 monit         - Monitor resources"
    echo "  pm2 restart all   - Restart all workers"
    echo "  pm2 stop all      - Stop all workers"
    echo ""
    echo "To enable auto-start on system reboot:"
    echo "  pm2 startup"
    echo "  pm2 save"
else
    echo ""
    echo "To start the workers later, run:"
    echo "  pm2 start ecosystem.config.js"
fi

echo ""
echo "======================================"
echo "Setup Complete! 🎉"
echo "======================================"
