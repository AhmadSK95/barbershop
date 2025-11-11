#!/bin/bash

# AI Hairstyle Generation - Quick Setup Script
# This script sets up the Python environment and installs dependencies

set -e  # Exit on error

echo "🎨 AI Hairstyle Generation Setup"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Python version
echo "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION found"
else
    echo -e "${RED}✗${NC} Python 3 not found. Please install Python 3.9 or higher."
    exit 1
fi

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo -e "${YELLOW}!${NC} Virtual environment already exists"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing old virtual environment..."
        rm -rf venv
    fi
fi

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo -e "${GREEN}✓${NC} Virtual environment created"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
echo -e "${GREEN}✓${NC} pip upgraded"

# Detect GPU
echo ""
echo "Detecting GPU..."
if command -v nvidia-smi &> /dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1)
    echo -e "${GREEN}✓${NC} NVIDIA GPU detected: $GPU_INFO"
    echo "Installing PyTorch with CUDA support..."
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${GREEN}✓${NC} macOS detected (will use MPS if available)"
    echo "Installing PyTorch..."
    pip install torch torchvision
else
    echo -e "${YELLOW}!${NC} No GPU detected - will use CPU (slower)"
    echo "Installing PyTorch (CPU)..."
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
fi

# Install dependencies
echo ""
echo "Installing AI dependencies..."
echo "⚠️  This may take 5-15 minutes on first run"
echo "Models will be downloaded (~6 GB)"
echo ""

pip install -r requirements.txt

echo ""
echo -e "${GREEN}✓${NC} All dependencies installed"

# Verify installation
echo ""
echo "Verifying installation..."
python3 -c "
import torch
import sys

print('PyTorch version:', torch.__version__)

if torch.cuda.is_available():
    print('✓ CUDA available')
    print('  Device:', torch.cuda.get_device_name(0))
    print('  VRAM:', round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 1), 'GB')
elif torch.backends.mps.is_available():
    print('✓ MPS (Apple Silicon) available')
else:
    print('⚠️  Running on CPU (slower performance)')
" || echo -e "${RED}✗${NC} Installation verification failed"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating .env file..."
    cat > .env << EOF
PORT=5001
FLASK_ENV=development
EOF
    echo -e "${GREEN}✓${NC} .env file created"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Activate the virtual environment:"
echo "   source venv/bin/activate"
echo ""
echo "2. Start the AI backend:"
echo "   python3 app.py"
echo ""
echo "3. Test the backend:"
echo "   curl http://localhost:5001/health"
echo ""
echo "4. Update your React .env file:"
echo "   REACT_APP_AI_BACKEND_URL=http://localhost:5001"
echo ""
echo "See AI_HAIRSTYLE_GENERATION_SETUP.md for full documentation"
echo "=================================="
