#!/bin/bash

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create project directory
sudo mkdir -p /root/tweeter
cd /root/tweeter

# Initialize git and set remote
git init
git remote add origin https://github.com/yourusername/tweeter.git
git pull origin main

# Install dependencies
npm install

# Start the server with PM2
pm2 start api/index.js --name tweeter
pm2 save

# Setup PM2 to start on boot
pm2 startup
