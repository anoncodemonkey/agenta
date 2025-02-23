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

# Setup environment variables
cat > .env << EOL
SUPABASE_URL=https://fwcpubehwjbraaytapvl.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Y3B1YmVod2picmFheXRhcHZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzY0MzU0MiwiZXhwIjoyMDUzMjE5NTQyfQ.bfT6yOBYrjj4bT5-fPzrNS00BQ9IPsUV-S1tNYK2i0s
PORT=3000
AGENT_KEY=WarAndPeace888
EOL

# Start the server with PM2
pm2 start api/index.js --name agenta
pm2 save

# Setup PM2 to start on boot
pm2 startup
