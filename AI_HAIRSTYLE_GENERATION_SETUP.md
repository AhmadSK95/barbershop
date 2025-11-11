# 🎨 AI Hairstyle Generation Setup Guide

## Overview

This guide will help you set up the **Stable Diffusion + ControlNet** AI hairstyle generation feature for your barbershop application. This feature uses advanced AI to generate realistic hairstyle transformations on customer photos.

## Features

✨ **Real AI-Generated Hairstyles** - Not just overlays, actual AI-generated transformations  
🎯 **Face Preservation** - Maintains facial features using ControlNet  
⚡ **Multiple Styles** - Generate fade, pompadour, undercut, buzz cut, and more  
🔄 **Batch Generation** - Generate multiple styles at once  
🖼️ **High Quality** - 512x512 resolution with professional results  

---

## System Requirements

### Hardware Requirements

#### Minimum (CPU-only - Slow)
- **CPU**: Modern multi-core processor (Intel i5/AMD Ryzen 5 or better)
- **RAM**: 16 GB
- **Storage**: 20 GB free space
- **Generation Time**: ~2-3 minutes per image

#### Recommended (NVIDIA GPU)
- **GPU**: NVIDIA RTX 3060 or better (12GB+ VRAM)
- **RAM**: 16 GB
- **Storage**: 30 GB free space
- **Generation Time**: ~15-30 seconds per image

#### Best (High-end GPU)
- **GPU**: NVIDIA RTX 4090, A100, or similar (24GB+ VRAM)
- **RAM**: 32 GB
- **Storage**: 50 GB free space
- **Generation Time**: ~5-10 seconds per image

#### Mac (Apple Silicon)
- **Chip**: M1/M2/M3 Pro or Max
- **RAM**: 16 GB minimum (32 GB recommended)
- **Storage**: 30 GB free space
- **Generation Time**: ~30-60 seconds per image

### Software Requirements

- **Python**: 3.9, 3.10, or 3.11 (3.10 recommended)
- **CUDA**: 11.8 or 12.1 (for NVIDIA GPUs)
- **Node.js**: 16+ (for frontend)
- **Operating System**: 
  - Linux (Ubuntu 20.04+) - Best performance
  - macOS 12+ (Apple Silicon)
  - Windows 10/11 with WSL2 (recommended) or native

---

## Installation

### Step 1: Install Python

Check if Python is installed:
```bash
python3 --version
```

If not installed, download from [python.org](https://www.python.org/downloads/) or use your package manager:

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip
```

**macOS:**
```bash
brew install python@3.10
```

**Windows:**
Download from [python.org](https://www.python.org/downloads/) and run the installer.

### Step 2: Install PyTorch

#### For NVIDIA GPU (Linux/Windows):
```bash
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

#### For Mac (Apple Silicon):
```bash
pip3 install torch torchvision
```

#### For CPU-only (Not Recommended - Very Slow):
```bash
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Step 3: Install AI Backend Dependencies

Navigate to the ai-backend directory:
```bash
cd /path/to/barbershop/ai-backend
```

Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

This will download:
- Stable Diffusion models (~4 GB)
- ControlNet models (~1.5 GB)
- Supporting libraries

**Note**: First-time model download may take 10-30 minutes depending on internet speed.

### Step 4: Verify Installation

Check if PyTorch can access your GPU:

```bash
python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"CPU\"}')"
```

Expected output:
```
CUDA available: True
Device: NVIDIA GeForce RTX 3060
```

Or for Mac:
```
CUDA available: False  # This is normal for Mac
Device: CPU  # Mac uses MPS backend automatically
```

---

## Running the AI Backend

### Method 1: Direct Python

From the `ai-backend` directory:

```bash
python3 app.py
```

The server will start on `http://localhost:5001`

You should see:
```
Loading models on device: cuda
Loading ControlNet model...
Loading Stable Diffusion pipeline...
Loading OpenPose detector...
✅ All models loaded successfully!
 * Running on http://0.0.0.0:5001
```

### Method 2: Using Environment Variables

Set custom port or configuration:

```bash
export PORT=5001
python3 app.py
```

### Method 3: Production Mode (with Gunicorn)

Install gunicorn:
```bash
pip install gunicorn
```

Run:
```bash
gunicorn -w 1 -b 0.0.0.0:5001 --timeout 300 app:app
```

**Note**: Only use 1 worker (`-w 1`) because GPU memory is shared!

---

## Frontend Configuration

### Update Environment Variables

Create or update `.env` in your barbershop root directory:

```env
REACT_APP_AI_BACKEND_URL=http://localhost:5001
```

For production:
```env
REACT_APP_AI_BACKEND_URL=https://your-ai-backend-domain.com
```

### Restart React Development Server

```bash
npm start
```

---

## Usage

### Testing the API

#### 1. Health Check

```bash
curl http://localhost:5001/health
```

Expected response:
```json
{
  "status": "healthy",
  "device": "cuda",
  "models_loaded": true
}
```

#### 2. Generate Single Hairstyle

```bash
curl -X POST http://localhost:5001/generate-hairstyle \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQ...",
    "hairstyle": "fade",
    "strength": 0.8,
    "guidance_scale": 7.5
  }'
```

#### 3. Batch Generate

```bash
curl -X POST http://localhost:5001/batch-generate \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQ...",
    "hairstyles": ["fade", "pompadour", "undercut"]
  }'
```

### Available Hairstyles

- `fade` - Professional fade haircut
- `buzz` - Buzz cut
- `pompadour` - Pompadour hairstyle
- `undercut` - Undercut style
- `crew` - Crew cut
- `textured` - Textured crop
- `long` - Long hair
- `curly` - Curly hair
- `dreadlocks` - Dreadlocks
- `mohawk` - Mohawk

---

## Performance Optimization

### 1. GPU Memory Optimization

If you get "Out of Memory" errors:

**Edit `app.py`** and uncomment these lines:
```python
pipe.enable_model_cpu_offload()  # Move models to CPU when not in use
pipe.enable_attention_slicing()   # Reduce memory usage
```

### 2. Speed vs Quality Trade-off

Adjust `num_inference_steps` in `app.py`:

```python
# Fast (lower quality) - ~5-10 seconds
num_inference_steps=10

# Balanced (current) - ~15-30 seconds
num_inference_steps=20

# High quality (slower) - ~40-60 seconds
num_inference_steps=50
```

### 3. Use Half Precision (FP16)

For NVIDIA GPUs, FP16 is automatically enabled. This cuts memory usage in half!

### 4. Compile for Speed (PyTorch 2.0+)

Add to `app.py` after loading the model:
```python
pipe.unet = torch.compile(pipe.unet, mode="reduce-overhead")
```

This gives ~20-30% speed improvement after first run.

---

## Troubleshooting

### Issue 1: "CUDA out of memory"

**Solutions:**
1. Reduce image size to 256x256 instead of 512x512
2. Enable `enable_model_cpu_offload()` and `enable_attention_slicing()`
3. Close other GPU-intensive applications
4. Use a GPU with more VRAM

### Issue 2: "Models not loading"

**Solutions:**
1. Check internet connection (models download from HuggingFace)
2. Clear HuggingFace cache: `rm -rf ~/.cache/huggingface`
3. Manually download models:
   ```bash
   python3 -c "from diffusers import ControlNetModel; ControlNetModel.from_pretrained('lllyasviel/control_v11p_sd15_openpose')"
   ```

### Issue 3: "Very slow generation (2+ minutes)"

**Cause:** Running on CPU instead of GPU

**Solutions:**
1. Verify GPU is detected: `nvidia-smi` (NVIDIA) or check Activity Monitor (Mac)
2. Reinstall PyTorch with correct CUDA version
3. Check if another process is using the GPU

### Issue 4: "Connection refused" from frontend

**Solutions:**
1. Ensure AI backend is running: `curl http://localhost:5001/health`
2. Check firewall settings
3. Update `REACT_APP_AI_BACKEND_URL` in `.env`
4. Restart both frontend and backend

### Issue 5: "Poor quality results"

**Solutions:**
1. Increase `num_inference_steps` to 30 or 50
2. Adjust `guidance_scale` (try 8.0-10.0 for stronger style)
3. Use higher quality input images (good lighting, clear face)
4. Increase `controlnet_conditioning_scale` for better face preservation

### Issue 6: Mac Performance Issues

**Solutions:**
1. Ensure using MPS backend: Check logs for "device: mps"
2. Close other memory-intensive apps
3. Use lower resolution images
4. Consider using cloud GPU services (see below)

---

## Cloud Deployment Options

If local GPU resources are limited:

### Option 1: AWS EC2 with GPU

**Instance Type**: `g4dn.xlarge` or `g5.xlarge`  
**Cost**: ~$0.50-1.00/hour  
**Setup Time**: 30 minutes

### Option 2: Google Cloud Platform

**Instance Type**: `n1-standard-4` + NVIDIA T4  
**Cost**: ~$0.40/hour  
**Setup Time**: 30 minutes

### Option 3: RunPod.io

**Instance Type**: RTX 3090 or better  
**Cost**: ~$0.20-0.40/hour  
**Setup Time**: 10 minutes (easiest)

### Option 4: Replicate API (No Setup)

If you don't want to manage infrastructure, use Replicate:
- No setup required
- Pay per generation (~$0.01-0.02 per image)
- Instant scaling
- Different models available

---

## Production Deployment

### Using Docker

Create `ai-backend/Dockerfile`:

```dockerfile
FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y python3.10 python3-pip
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app.py .

CMD ["python3", "app.py"]
```

Build and run:
```bash
docker build -t barbershop-ai .
docker run --gpus all -p 5001:5001 barbershop-ai
```

### Using Docker Compose

Add to root `docker-compose.yml`:

```yaml
ai-backend:
  build: ./ai-backend
  ports:
    - "5001:5001"
  environment:
    - PORT=5001
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

---

## Monitoring & Logging

### View Logs

```bash
# AI Backend logs
tail -f ai-backend.log

# Check GPU usage
watch -n 1 nvidia-smi  # NVIDIA
```

### Performance Metrics

Track these metrics:
- **Generation time**: Target <30 seconds
- **GPU memory usage**: Should be <10 GB for single generation
- **Success rate**: Target >95%
- **Queue time**: If using job queue

---

## Security Considerations

1. **API Rate Limiting**: Add rate limiting to prevent abuse
2. **Input Validation**: Validate image size and format
3. **CORS**: Update CORS settings for production domain
4. **Authentication**: Add API keys for production use
5. **Content Filtering**: Add NSFW content detection if needed

---

## Cost Estimates

### Self-Hosted (GPU)
- **RTX 3060**: $300-400 (one-time) + electricity
- **Cloud GPU**: $0.20-1.00/hour

### API Services
- **Replicate**: $0.01-0.02 per generation
- **AWS Bedrock**: $0.02-0.03 per generation

### Typical Usage
- 100 generations/day = $1-2/day (cloud) or $0.10/day (self-hosted electricity)

---

## Next Steps

1. ✅ Test basic generation with sample images
2. ✅ Optimize performance for your hardware
3. 🔄 Add more hairstyle styles to `HAIRSTYLE_PROMPTS`
4. 🔄 Implement caching for faster repeat generations
5. 🔄 Add user feedback system to improve results
6. 🔄 Create admin dashboard for monitoring

---

## Support & Resources

### Official Documentation
- [Stable Diffusion](https://github.com/Stability-AI/stablediffusion)
- [ControlNet](https://github.com/lllyasviel/ControlNet)
- [Diffusers Library](https://huggingface.co/docs/diffusers)

### Community
- [HuggingFace Forums](https://discuss.huggingface.co/)
- [Stable Diffusion Reddit](https://reddit.com/r/StableDiffusion)

### Issues
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Email: support@balkanbarber.com

---

**Version:** 1.0.0  
**Last Updated:** November 6, 2025  
**Status:** Ready for Testing 🚀
