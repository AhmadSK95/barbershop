from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import torch
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel, UniPCMultistepScheduler
from controlnet_aux import OpenposeDetector
import io
import base64
import os
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global variables for models
pipe = None
openpose = None
device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"

# Hairstyle prompts mapping
HAIRSTYLE_PROMPTS = {
    "fade": "professional fade haircut, short sides, clean cut, barbershop style, well-groomed",
    "buzz": "buzz cut, very short hair, military style, clean shaved head",
    "pompadour": "pompadour hairstyle, slicked back hair, volumized top, classic style",
    "undercut": "undercut hairstyle, shaved sides, longer top, modern style",
    "crew": "crew cut, short uniform length, neat and tidy, professional",
    "textured": "textured crop, messy top, short sides, modern casual style",
    "long": "long flowing hair, shoulder length, natural look",
    "curly": "curly hair, natural curls, voluminous",
    "dreadlocks": "dreadlocks, long locs, well-maintained",
    "mohawk": "mohawk hairstyle, shaved sides, tall center strip"
}

def load_models():
    """Load AI models on startup"""
    global pipe, openpose
    
    logger.info(f"Loading models on device: {device}")
    
    try:
        # Load ControlNet model
        logger.info("Loading ControlNet model...")
        controlnet = ControlNetModel.from_pretrained(
            "lllyasviel/control_v11p_sd15_openpose",
            torch_dtype=torch.float16 if device == "cuda" else torch.float32
        )
        
        # Load Stable Diffusion pipeline with ControlNet
        logger.info("Loading Stable Diffusion pipeline...")
        pipe = StableDiffusionControlNetPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            controlnet=controlnet,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            safety_checker=None
        )
        
        # Optimize for speed
        pipe.scheduler = UniPCMultistepScheduler.from_config(pipe.scheduler.config)
        pipe = pipe.to(device)
        
        # Enable memory optimizations
        if device == "cuda":
            pipe.enable_model_cpu_offload()
            pipe.enable_attention_slicing()
        
        # Load OpenPose detector for face/pose preservation
        logger.info("Loading OpenPose detector...")
        openpose = OpenposeDetector.from_pretrained("lllyasviel/ControlNet")
        
        logger.info("✅ All models loaded successfully!")
        
    except Exception as e:
        logger.error(f"Error loading models: {str(e)}")
        raise

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "device": device,
        "models_loaded": pipe is not None and openpose is not None
    })

@app.route('/generate-hairstyle', methods=['POST'])
def generate_hairstyle():
    """Generate hairstyle transformation"""
    try:
        # Get request data
        data = request.get_json()
        
        if not data or 'image' not in data or 'hairstyle' not in data:
            return jsonify({"error": "Missing image or hairstyle parameter"}), 400
        
        # Decode base64 image
        image_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        image_bytes = base64.b64decode(image_data)
        input_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Resize for faster processing
        input_image = input_image.resize((512, 512))
        
        # Get hairstyle type
        hairstyle = data['hairstyle'].lower()
        hairstyle_prompt = HAIRSTYLE_PROMPTS.get(hairstyle, HAIRSTYLE_PROMPTS['fade'])
        
        # Get optional parameters
        strength = data.get('strength', 0.8)  # How much to change (0.5-1.0)
        guidance_scale = data.get('guidance_scale', 7.5)  # Prompt adherence
        
        logger.info(f"Generating {hairstyle} hairstyle transformation...")
        
        # Extract pose/face structure using OpenPose
        pose_image = openpose(input_image)
        
        # Build prompt
        prompt = f"portrait photo of a person with {hairstyle_prompt}, high quality, detailed, professional photography, natural lighting"
        negative_prompt = "ugly, deformed, disfigured, poor quality, low resolution, blurry, cartoon, drawing, anime"
        
        # Generate image
        with torch.inference_mode():
            result = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=pose_image,
                num_inference_steps=20,  # Balance speed/quality
                guidance_scale=guidance_scale,
                controlnet_conditioning_scale=strength,
            ).images[0]
        
        # Convert result to base64
        buffer = io.BytesIO()
        result.save(buffer, format="PNG")
        buffer.seek(0)
        result_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        logger.info("✅ Hairstyle generation complete!")
        
        return jsonify({
            "success": True,
            "image": f"data:image/png;base64,{result_base64}",
            "hairstyle": hairstyle,
            "prompt": prompt
        })
        
    except Exception as e:
        logger.error(f"Error generating hairstyle: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/available-hairstyles', methods=['GET'])
def available_hairstyles():
    """Get list of available hairstyles"""
    return jsonify({
        "hairstyles": list(HAIRSTYLE_PROMPTS.keys())
    })

@app.route('/batch-generate', methods=['POST'])
def batch_generate():
    """Generate multiple hairstyle variations at once"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data or 'hairstyles' not in data:
            return jsonify({"error": "Missing image or hairstyles parameter"}), 400
        
        # Decode base64 image
        image_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        image_bytes = base64.b64decode(image_data)
        input_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        input_image = input_image.resize((512, 512))
        
        # Extract pose once for all generations
        pose_image = openpose(input_image)
        
        results = []
        hairstyles = data['hairstyles']
        
        logger.info(f"Batch generating {len(hairstyles)} hairstyles...")
        
        for hairstyle in hairstyles:
            hairstyle = hairstyle.lower()
            hairstyle_prompt = HAIRSTYLE_PROMPTS.get(hairstyle, HAIRSTYLE_PROMPTS['fade'])
            
            prompt = f"portrait photo of a person with {hairstyle_prompt}, high quality, detailed, professional photography"
            negative_prompt = "ugly, deformed, disfigured, poor quality, low resolution, blurry"
            
            with torch.inference_mode():
                result = pipe(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    image=pose_image,
                    num_inference_steps=20,
                    guidance_scale=7.5,
                ).images[0]
            
            # Convert to base64
            buffer = io.BytesIO()
            result.save(buffer, format="PNG")
            buffer.seek(0)
            result_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            results.append({
                "hairstyle": hairstyle,
                "image": f"data:image/png;base64,{result_base64}"
            })
        
        logger.info(f"✅ Batch generation complete!")
        
        return jsonify({
            "success": True,
            "results": results
        })
        
    except Exception as e:
        logger.error(f"Error in batch generation: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Load models on module import (so Flask CLI also loads them)
logger.info("Starting AI Hairstyle Generation API...")
try:
    load_models()
except Exception as e:
    logger.error(f"Failed to load models: {e}")
    logger.info("Server will start but AI generation will not work")

if __name__ == '__main__':
    # Start Flask server
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
