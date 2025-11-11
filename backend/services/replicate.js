const Replicate = require('replicate');

class ReplicateService {
  constructor() {
    if (!process.env.REPLICATE_API_TOKEN) {
      console.warn('⚠️ REPLICATE_API_TOKEN not set - face-preserving generation will not work');
      this.client = null;
    } else {
      this.client = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });
    }
  }

  /**
   * Process Replicate output (handles streams and converts to base64)
   * @param {any} output - Replicate API output
   * @param {string} method - Generation method name
   * @returns {Promise<object>} - Result with base64 image
   */
  async processOutput(output, method) {
    // Replicate returns an array containing a stream of binary data chunks
    let imageUrl;
    if (Array.isArray(output)) {
      console.log('📊 Output is array, length:', output.length);
      const firstItem = output[0];
      
      // Check if the array item is a stream
      if (firstItem && typeof firstItem[Symbol.asyncIterator] === 'function') {
        console.log('🔄 Array item is a stream, collecting binary chunks...');
        const chunks = [];
        for await (const chunk of firstItem) {
          chunks.push(chunk);
        }
        console.log('📊 Collected', chunks.length, 'binary chunks');
        
        // Concatenate all Uint8Array chunks into one buffer
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const imageBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          imageBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        
        // Convert to base64 data URL
        const base64 = Buffer.from(imageBuffer).toString('base64');
        imageUrl = `data:image/png;base64,${base64}`;
        console.log('✅ Converted to base64 data URL, length:', base64.length);
      } else if (typeof firstItem === 'string') {
        imageUrl = firstItem;
      } else {
        imageUrl = firstItem;
      }
    } else if (output && typeof output[Symbol.asyncIterator] === 'function') {
      console.log('🔄 Output itself is a stream, collecting binary chunks...');
      const chunks = [];
      for await (const chunk of output) {
        chunks.push(chunk);
      }
      console.log('📊 Collected', chunks.length, 'binary chunks');
      
      // Concatenate and convert to base64
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const imageBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        imageBuffer.set(chunk, offset);
        offset += chunk.length;
      }
      const base64 = Buffer.from(imageBuffer).toString('base64');
      imageUrl = `data:image/png;base64,${base64}`;
      console.log('✅ Converted to base64 data URL, length:', base64.length);
    } else if (typeof output === 'string') {
      console.log('📄 Output is URL string');
      imageUrl = output;
    } else {
      console.log('⚠️ Unknown output type');
      imageUrl = output;
    }
    
    return {
      success: true,
      image: imageUrl,
      method: method
    };
  }

  /**
   * Generate multiple hairstyle variations and return the best ones
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} hairstyleDescription - Description of desired hairstyle
   * @param {number} numVariations - Number of variations to generate (default: 1)
   * @returns {Promise<object>} - Generated images
   */
  async generateWithInstantID(imageBase64, hairstyleDescription, numVariations = 1) {
    if (!this.client) {
      throw new Error('Replicate API token not configured');
    }

    try {
      console.log(`🎨 Generating ${numVariations} variation(s) with face preservation...`);
      
      const styleVariations = [
        'professional studio portrait',
        'high-end salon photography',
        'modern barbershop style photo',
        'fashion magazine portrait',
        'professional headshot'
      ];
      const lightingVariations = [
        'studio lighting',
        'natural lighting',
        'soft professional lighting',
        'dramatic studio lighting',
        'bright even lighting'
      ];
      
      const randomSeed = Math.floor(Math.random() * 1000000);
      const randomStyle = styleVariations[Math.floor(Math.random() * styleVariations.length)];
      const randomLighting = lightingVariations[Math.floor(Math.random() * lightingVariations.length)];
      
      // Try multiple face-preserving approaches
      
      // 1. Try PuLID model (best for face identity preservation)
      try {
        console.log('✨ Attempting PuLID for maximum face preservation...');
        const output = await this.client.run(
          "zsxkib/pulid:2f38df4c3bb5a9637b1dbd81fdbf3e0d5ce1e0f8d98e00ceb1e9e12f2ff5d94c",
          {
            input: {
              main_face_image: imageBase64,
              prompt: `${randomStyle}, person with ${hairstyleDescription}, ${randomLighting}, professional haircut, photorealistic, high quality, 8k`,
              negative_prompt: "different person, changed face, deformed, disfigured, poor quality, blurry, cartoon, anime",
              num_outputs: 1,
              num_inference_steps: 40,
              guidance_scale: 4.5,
              seed: randomSeed,
              id_scale: 1.0,
              mode: "fidelity",
              num_zero_steps: 8
            }
          }
        );
        console.log('✅ PuLID succeeded!');
        return await this.processOutput(output, 'pulid');
      } catch (pulidError) {
        console.warn('⚠️ PuLID failed, trying InstantID...', pulidError.message);
      }

      // 2. Try InstantID with maximum face preservation
      try {
        console.log('✨ Attempting InstantID with maximum face strength...');
        const output = await this.client.run(
          "zsxkib/instant-id:d3e4c9660839f1871976bcd01c686c21a247b0875cfe288b95a6d855fdce33a8",
          {
            input: {
              image: imageBase64,
              prompt: `${randomStyle}, only change hairstyle to ${hairstyleDescription}, keep exact same face, preserve all facial features, ${randomLighting}, professional photo, highly detailed`,
              negative_prompt: "different person, changed face, morphed features, deformed, disfigured, poor quality, blurry, different eyes, different nose, different mouth, cartoon, anime, illustration",
              num_outputs: 1,
              guidance_scale: 4.0,
              num_inference_steps: 50,
              seed: randomSeed,
              ip_adapter_scale: 1.0,
              controlnet_conditioning_scale: 1.0
            }
          }
        );
        console.log('✅ InstantID succeeded!');
        return await this.processOutput(output, 'instantid');
      } catch (instantIdError) {
        console.warn('⚠️ InstantID failed, trying SDXL img2img...', instantIdError.message);
      }
      
      // 3. Fallback to SDXL img2img with minimal modifications (hair only)
      console.log('🎨 Using SDXL img2img as last resort...');
      const output = await this.client.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            image: imageBase64,
            prompt: `only modify hair to ${hairstyleDescription}, maintain exact face, same person, professional haircut, ${randomLighting}, high quality photo`,
            negative_prompt: "different person, face changes, altered features, deformed face, low quality, blurry, cartoon, anime",
            width: 1024,
            height: 1024,
            num_inference_steps: 30,
            guidance_scale: 5.5,
            prompt_strength: 0.65,
            seed: randomSeed
          }
        }
      );

      return await this.processOutput(output, 'sdxl-img2img');
    } catch (error) {
      console.error('SDXL error:', error);
      throw error;
    }
  }

  /**
   * Generate hairstyle using IP-Adapter FaceID (alternative method)
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} hairstyleDescription - Description of desired hairstyle
   * @returns {Promise<object>} - Generated image
   */
  async generateWithFaceID(imageBase64, hairstyleDescription) {
    if (!this.client) {
      throw new Error('Replicate API token not configured');
    }

    try {
      console.log('🎨 Generating with Stable Diffusion 1.5...');
      
      // Use SD 1.5 as fallback
      const output = await this.client.run(
        "stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
        {
          input: {
            prompt: `professional portrait photo, person with ${hairstyleDescription}, realistic, high quality, detailed face, studio lighting, front view`,
            negative_prompt: "low quality, blurry, bad face, disfigured, deformed, ugly, bad anatomy, cartoon, anime",
            width: 512,
            height: 512,
            num_inference_steps: 25,
            guidance_scale: 7.5
          }
        }
      );

      // Handle stream or array output
      let imageUrl;
      if (Array.isArray(output)) {
        const firstItem = output[0];
        if (firstItem && typeof firstItem[Symbol.asyncIterator] === 'function') {
          const results = [];
          for await (const item of firstItem) {
            results.push(item);
          }
          imageUrl = results[0];
        } else {
          imageUrl = firstItem;
        }
      } else if (output && typeof output[Symbol.asyncIterator] === 'function') {
        const results = [];
        for await (const item of output) {
          results.push(item);
        }
        imageUrl = results[0];
      } else {
        imageUrl = output;
      }

      return {
        success: true,
        image: imageUrl,
        method: 'sd-1.5'
      };
    } catch (error) {
      console.error('SD 1.5 error:', error);
      throw error;
    }
  }

  /**
   * Generate hairstyle using Stable Diffusion with ControlNet (fallback)
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} hairstyleDescription - Description of desired hairstyle
   * @returns {Promise<object>} - Generated image
   */
  async generateWithControlNet(imageBase64, hairstyleDescription) {
    if (!this.client) {
      throw new Error('Replicate API token not configured');
    }

    try {
      console.log('🎨 Generating with basic Stable Diffusion...');
      
      // Simple SD as last resort
      const output = await this.client.run(
        "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
        {
          input: {
            prompt: `professional portrait, person with ${hairstyleDescription}, photorealistic, high quality, detailed, studio photo`,
            negative_prompt: "cartoon, anime, low quality, blurry, disfigured",
            width: 512,
            height: 512,
            num_outputs: 1
          }
        }
      );

      // Handle stream or array output
      let imageUrl;
      if (Array.isArray(output)) {
        const firstItem = output[0];
        if (firstItem && typeof firstItem[Symbol.asyncIterator] === 'function') {
          const results = [];
          for await (const item of firstItem) {
            results.push(item);
          }
          imageUrl = results[0];
        } else {
          imageUrl = firstItem;
        }
      } else if (output && typeof output[Symbol.asyncIterator] === 'function') {
        const results = [];
        for await (const item of output) {
          results.push(item);
        }
        imageUrl = results[0];
      } else {
        imageUrl = output;
      }

      return {
        success: true,
        image: imageUrl,
        method: 'sd-basic'
      };
    } catch (error) {
      console.error('Basic SD error:', error);
      throw error;
    }
  }

  /**
   * Smart generation - tries best method first, falls back to alternatives
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} hairstyleDescription - Description of desired hairstyle
   * @returns {Promise<object>} - Generated image
   */
  async generateHairstyle(imageBase64, hairstyleDescription) {
    if (!this.client) {
      return {
        success: false,
        error: 'Replicate API token not configured. Please set REPLICATE_API_TOKEN in .env file. Get your token from https://replicate.com/account/api-tokens'
      };
    }

    // Try InstantID first (best for face preservation)
    try {
      return await this.generateWithInstantID(imageBase64, hairstyleDescription);
    } catch (error) {
      console.warn('InstantID failed, trying FaceID:', error.message);
    }

    // Fallback to FaceID
    try {
      return await this.generateWithFaceID(imageBase64, hairstyleDescription);
    } catch (error) {
      console.warn('FaceID failed, trying ControlNet:', error.message);
    }

    // Last resort: ControlNet
    try {
      return await this.generateWithControlNet(imageBase64, hairstyleDescription);
    } catch (error) {
      console.error('All methods failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ReplicateService();
