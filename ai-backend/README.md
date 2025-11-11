# 🤖 AI Hairstyle Generation Backend

This is the AI backend service for generating realistic hairstyle transformations using **Stable Diffusion + ControlNet**.

## Quick Start

### 1. Run Setup Script (Easiest)

```bash
./setup.sh
```

This will automatically:
- Create a Python virtual environment
- Detect your GPU (NVIDIA/Apple Silicon/CPU)
- Install all dependencies
- Download AI models (~6 GB)

### 2. Manual Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install PyTorch (choose your platform)
# NVIDIA GPU:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Mac:
pip install torch torchvision

# Install other dependencies
pip install -r requirements.txt
```

### 3. Start Server

```bash
python3 app.py
```

Server runs on: `http://localhost:5001`

## API Endpoints

### Health Check
```bash
GET /health
```

### Generate Single Hairstyle
```bash
POST /generate-hairstyle
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,...",
  "hairstyle": "fade",
  "strength": 0.8,
  "guidance_scale": 7.5
}
```

### Batch Generate
```bash
POST /batch-generate
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,...",
  "hairstyles": ["fade", "pompadour", "undercut"]
}
```

### Available Hairstyles
```bash
GET /available-hairstyles
```

## Available Styles

- `fade` - Professional fade
- `buzz` - Buzz cut
- `pompadour` - Pompadour
- `undercut` - Undercut
- `crew` - Crew cut
- `textured` - Textured crop
- `long` - Long hair
- `curly` - Curly hair
- `dreadlocks` - Dreadlocks
- `mohawk` - Mohawk

## Performance

| Hardware | Generation Time |
|----------|----------------|
| RTX 4090 | ~5-10 seconds |
| RTX 3060 | ~15-30 seconds |
| Mac M1/M2 | ~30-60 seconds |
| CPU Only | ~2-3 minutes |

## Files

- `app.py` - Main Flask application
- `requirements.txt` - Python dependencies
- `setup.sh` - Quick setup script
- `.env` - Environment variables (created by setup)

## Configuration

Edit `app.py` to adjust:
- `num_inference_steps` - Quality vs speed (10-50)
- `guidance_scale` - Prompt adherence (5-15)
- `controlnet_conditioning_scale` - Face preservation (0.5-1.0)

## Troubleshooting

### Out of Memory
```python
# Enable in app.py:
pipe.enable_model_cpu_offload()
pipe.enable_attention_slicing()
```

### Slow Generation
1. Check GPU is detected: `nvidia-smi` or Activity Monitor
2. Verify CUDA: `python3 -c "import torch; print(torch.cuda.is_available())"`
3. Reduce `num_inference_steps` to 10-15

### Models Not Loading
```bash
# Clear cache and retry
rm -rf ~/.cache/huggingface
python3 app.py
```

## Full Documentation

See `../AI_HAIRSTYLE_GENERATION_SETUP.md` for complete setup guide.

## Support

- Email: support@balkanbarber.com
- Issues: [GitHub Issues](https://github.com/your-repo/issues)

---

**Status:** Production Ready ✅  
**Version:** 1.0.0
