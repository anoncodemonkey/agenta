#!/bin/bash

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create project directory
sudo mkdir -p /root/agenta
cd /root/agenta

# Initialize git and set remote
git init
git remote add origin https://github.com/anoncodemonkey/agenta.git
git pull origin main

# Install dependencies
npm install

# Create cookies directory
mkdir -p cookies
chmod 755 cookies

# Setup environment variables
cat > .env << EOL
PORT=3000
AGENT_KEY=Shakespeare888
NODE_ENV=production
EOL

# Configure firewall
sudo apt-get install -y ufw
sudo ufw allow ssh
sudo ufw allow 3000
sudo ufw --force enable

# Start the server with PM2
pm2 start api/index.js --name agenta
pm2 save

# Setup PM2 to start on boot
pm2 startup
