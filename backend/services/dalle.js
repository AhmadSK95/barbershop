const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

class DalleService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Create images directory if it doesn't exist
    this.imagesDir = path.join(__dirname, '../public/generated-images');
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true });
    }
  }
  
  /**
   * Download and save image from URL to local storage
   * @param {string} imageUrl - URL of the image to download
   * @param {string} filename - Filename to save as
   * @returns {Promise<string>} - Path to saved image
   */
  async downloadAndSaveImage(imageUrl, filename) {
    return new Promise((resolve, reject) => {
      const filepath = path.join(this.imagesDir, filename);
      const file = fs.createWriteStream(filepath);
      
      https.get(imageUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          // Return relative URL path for frontend
          const relativeUrl = `/generated-images/${filename}`;
          resolve(relativeUrl);
        });
      }).on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete incomplete file
        reject(err);
      });
    });
  }
  
  /**
   * Generate unique filename for image
   * @returns {string} - Unique filename
   */
  generateFilename() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `generated-${timestamp}-${random}.png`;
  }

  /**
   * Generate a hairstyle image based on a text prompt
   * @param {string} prompt - Description of the hairstyle
   * @param {object} options - Generation options
   * @returns {Promise<object>} - Generated image data
   */
  async generateHairstyle(prompt, options = {}) {
    try {
      const response = await this.client.images.generate({
        model: options.model || "dall-e-3",
        prompt: prompt,
        n: options.count || 1,
        size: options.size || "1024x1024",
        quality: options.quality || "standard",
        style: options.style || "natural"
      });

      // Download and persist images locally
      const persistedImages = await Promise.all(
        response.data.map(async (img) => {
          try {
            const filename = this.generateFilename();
            const localUrl = await this.downloadAndSaveImage(img.url, filename);
            return {
              url: localUrl,
              revised_prompt: img.revised_prompt,
              originalUrl: img.url
            };
          } catch (downloadError) {
            console.error('Failed to persist image, using original URL:', downloadError.message);
            // Fallback to original URL if persistence fails
            return {
              url: img.url,
              revised_prompt: img.revised_prompt
            };
          }
        })
      );

      return {
        success: true,
        images: persistedImages
      };
    } catch (error) {
      console.error('DALL-E generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate hairstyle variations for barbershop
   * @param {string} baseDescription - Base hairstyle description
   * @param {string} customerPreferences - Customer-specific preferences
   * @returns {Promise<object>} - Generated images
   */
  async generateHairstyleVariations(baseDescription, customerPreferences = '') {
    const prompt = `Professional barbershop hairstyle: ${baseDescription}. ${customerPreferences}. High quality, realistic, studio lighting, front-facing view, clean background.`;
    
    return await this.generateHairstyle(prompt, {
      quality: "hd",
      size: "1024x1024"
    });
  }

  /**
   * Analyze a photo using GPT-4 Vision
   * @param {string} imageBase64 - Base64 encoded image
   * @returns {Promise<string>} - Description of the person
   */
  async analyzePhoto(imageBase64) {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this person in extreme detail for a photorealistic portrait generation. Include: exact face shape, skin tone (be very specific), eye color and shape, nose shape and size, lip shape and fullness, jawline, cheekbones, facial structure, ethnicity/heritage, age (specific), facial hair (if any), glasses (if any), head shape, ear visibility and shape, neck thickness, any distinguishing facial features or marks. Be EXTREMELY detailed and precise. Write as if you're describing to an artist who needs to recreate this exact person."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('GPT-4 Vision error:', error);
      return 'a person';
    }
  }

  /**
   * Generate hairstyle based on user photo
   * @param {string} imageBase64 - Base64 encoded image of the user
   * @param {string} hairstyleType - Type of hairstyle
   * @param {string} additionalDetails - Additional styling details
   * @returns {Promise<object>} - Generated images
   */
  async generateHairstyleFromPhoto(imageBase64, hairstyleType, additionalDetails = '') {
    try {
      // Analyze the photo first
      console.log('Analyzing photo with GPT-4 Vision...');
      const personDescription = await this.analyzePhoto(imageBase64);
      console.log('Person description:', personDescription);
      
      // Create detailed prompt combining analysis and desired hairstyle
      // Emphasize consistency by being very specific about what stays the same
      const prompt = `Photorealistic portrait of a person with these EXACT features that must not change: ${personDescription}. Only difference from original: wearing a professional ${hairstyleType} haircut (${additionalDetails}). Same person, same face, same features - ONLY the hairstyle is different. Professional studio lighting, front-facing, clean background, high resolution, natural photographic style.`;
      
      console.log('Generating with DALL-E 3:', prompt.substring(0, 200) + '...');
      
      const result = await this.generateHairstyle(prompt, {
        quality: "hd",
        size: "1024x1024",
        style: "natural" // Use natural style for photorealism
      });
      
      console.log('Generated hairstyle images - persisted locally');
      return result;
    } catch (error) {
      console.error('Error in generateHairstyleFromPhoto:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate fade variations
   * @param {string} fadeType - Type of fade (low, mid, high, skin, etc.)
   * @param {string} additionalDetails - Additional styling details
   * @returns {Promise<object>} - Generated images
   */
  async generateFadeStyle(fadeType, additionalDetails = '') {
    const prompt = `Professional ${fadeType} fade haircut for men, ${additionalDetails}, realistic barbershop style, clean professional cut, high quality photography, studio lighting, front and side view.`;
    
    return await this.generateHairstyle(prompt, {
      quality: "hd",
      size: "1024x1024"
    });
  }
}

module.exports = new DalleService();
