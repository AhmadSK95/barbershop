#!/bin/bash

echo "🛑 Stopping Balkan Barber Shop..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running."
    exit 1
fi

# Stop and remove containers
echo "🔻 Stopping containers..."
docker-compose down

# Check if we should remove volumes
if [ "$1" = "--volumes" ] || [ "$1" = "-v" ]; then
    echo "🗑️  Removing volumes..."
    docker-compose down -v
fi

echo ""
echo "✅ Barbershop containers stopped!"
echo ""
echo "📝 To start again: ./start.sh"
echo "📝 To remove volumes: ./stop.sh --volumes"
