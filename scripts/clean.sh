#!/bin/bash

# NodeCart Cleanup Script
# Stops all services and removes volumes

echo "===================="
echo "Cleaning NodeCart"
echo "===================="

read -p "This will remove all containers and data. Continue? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Stopping and removing containers..."
  docker-compose down -v

  echo "Removing NodeCart images..."
  docker images | grep nodecart | awk '{print $3}' | xargs -r docker rmi -f

  echo "Pruning Docker system..."
  docker system prune -f

  echo "Done!"
else
  echo "Cancelled."
fi
