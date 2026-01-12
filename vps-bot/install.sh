#!/bin/bash

# ╔════════════════════════════════════════════════════════════╗
# ║           🤖 OTP Bot - One Command Installer               ║
# ║                                                            ║
# ║  Usage: curl -fsSL URL | bash                              ║
# ║                                                            ║
# ╚════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art
echo -e "${CYAN}"
cat << "EOF"
   ____  ______  ____        __  ____        __ 
  / __ \/_  __/ / __ )____  / /_/ __ )____  / /_
 / / / / / /   / __  / __ \/ __/ __  / __ \/ __/
/ /_/ / / /   / /_/ / /_/ / /_/ /_/ / /_/ / /_  
\____/ /_/   /_____/\____/\__/_____/\____/\__/  
                                                
EOF
echo -e "${NC}"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🚀 Starting OTP Bot Installation              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Running as root. Will install for root user.${NC}"
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
else
    OS=$(uname -s)
fi
echo -e "${BLUE}📦 Detected OS: ${OS}${NC}"

# Installation directory
INSTALL_DIR="$HOME/otp-bot"
echo -e "${BLUE}📁 Install directory: ${INSTALL_DIR}${NC}"
echo ""

# Step 1: Install Node.js if not present
echo -e "${CYAN}[1/5] Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}  ✅ Node.js ${NODE_VERSION} found${NC}"
else
    echo -e "${YELLOW}  📥 Installing Node.js...${NC}"
    
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    elif command -v dnf &> /dev/null; then
        # Fedora
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    else
        echo -e "${RED}  ❌ Unsupported package manager. Please install Node.js manually.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}  ✅ Node.js installed: $(node -v)${NC}"
fi

# Step 2: Install PM2 globally
echo -e "${CYAN}[2/5] Checking PM2...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}  ✅ PM2 found${NC}"
else
    echo -e "${YELLOW}  📥 Installing PM2...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}  ✅ PM2 installed${NC}"
fi

# Step 3: Create directory and download bot
echo -e "${CYAN}[3/5] Setting up bot files...${NC}"

# Create directory
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Create package.json
cat > package.json << 'PKGJSON'
{
  "name": "otp-telegram-bot",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@microsoft/microsoft-graph-client": "^3.0.7",
    "dotenv": "^16.3.1",
    "isomorphic-fetch": "^3.0.0",
    "node-telegram-bot-api": "^0.66.0"
  }
}
PKGJSON

# Download the bot file from GitHub (replace with your actual URL)
# For now, we'll copy the index.js content inline
cat > index.js << 'INDEXJS'
INDEXJS

echo -e "${GREEN}  ✅ Bot files created${NC}"

# Step 4: Install dependencies
echo -e "${CYAN}[4/5] Installing dependencies...${NC}"
npm install --production
echo -e "${GREEN}  ✅ Dependencies installed${NC}"

# Step 5: Setup PM2
echo -e "${CYAN}[5/5] Configuring PM2...${NC}"

# Create PM2 ecosystem file
cat > ecosystem.config.cjs << 'ECOSYSTEM'
module.exports = {
  apps: [{
    name: 'otp-bot',
    script: 'index.js',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production',
      SETUP_PORT: 3000
    }
  }]
}
ECOSYSTEM

# Start with PM2
pm2 delete otp-bot 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# Setup startup script
echo -e "${YELLOW}  📝 Setting up auto-start on boot...${NC}"
pm2 startup | tail -1 | bash 2>/dev/null || true
pm2 save

echo -e "${GREEN}  ✅ PM2 configured${NC}"

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_VPS_IP")

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ Installation Complete!                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}🌐 Open this URL in your browser to complete setup:${NC}"
echo ""
echo -e "   ${YELLOW}http://${SERVER_IP}:3000${NC}"
echo ""
echo -e "${CYAN}📋 Useful commands:${NC}"
echo -e "   ${BLUE}pm2 logs otp-bot${NC}     - View logs"
echo -e "   ${BLUE}pm2 restart otp-bot${NC}  - Restart bot"
echo -e "   ${BLUE}pm2 stop otp-bot${NC}     - Stop bot"
echo -e "   ${BLUE}pm2 status${NC}           - Check status"
echo ""
echo -e "${CYAN}📁 Bot location: ${INSTALL_DIR}${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  Make sure port 3000 is open in your firewall!${NC}"
echo -e "${BLUE}   sudo ufw allow 3000  ${NC}(for UFW)"
echo -e "${BLUE}   sudo firewall-cmd --add-port=3000/tcp --permanent${NC} (for firewalld)"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
