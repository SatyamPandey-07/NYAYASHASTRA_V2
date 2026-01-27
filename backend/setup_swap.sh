#!/bin/bash

# NyayaShastra - Swap Space Setup for External SSD
# This creates 8GB swap to prevent OOM crashes

set -e

echo "============================================"
echo "💾 Setting up Swap Space"
echo "============================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if swap already exists
CURRENT_SWAP=$(free -g | awk '/^Swap:/{print $2}')

if [ "$CURRENT_SWAP" -gt 0 ]; then
    echo -e "${GREEN}✅ Swap already configured (${CURRENT_SWAP}GB)${NC}"
    exit 0
fi

echo "Creating 8GB swap file..."
echo "⚠️  This requires sudo privileges"
echo ""

# Create swap file
sudo fallocate -l 8G /swapfile || {
    echo -e "${RED}Failed to create swap file${NC}"
    exit 1
}

# Set permissions
sudo chmod 600 /swapfile

# Make swap
sudo mkswap /swapfile

# Enable swap
sudo swapon /swapfile

# Make permanent
if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Configure swappiness (how aggressively to use swap)
# 10 = use swap only when necessary
sudo sysctl vm.swappiness=10

# Make swappiness permanent
if ! grep -q 'vm.swappiness' /etc/sysctl.conf; then
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
fi

echo ""
echo -e "${GREEN}✅ Swap configured successfully!${NC}"
echo ""
echo "Current memory status:"
free -h
echo ""
echo "This will help prevent system freezes during high memory usage."
