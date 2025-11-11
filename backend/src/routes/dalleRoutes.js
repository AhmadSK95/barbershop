const express = require('express');
const router = express.Router();
const dalleService = require('../../services/dalle');
const replicateService = require('../../services/replicate');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/dalle/generate
 * @desc    Generate a custom hairstyle image
 * @access  Private
 */
router.post('/generate', protect, async (req, res) => {
  try {
    const { prompt, options } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    const result = await dalleService.generateHairstyle(prompt, options);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate image',
        error: result.error
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in dalle/generate:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/dalle/hairstyle-variations
 * @desc    Generate hairstyle variations for a barbershop
 * @access  Private
 */
router.post('/hairstyle-variations', protect, async (req, res) => {
  try {
    const { baseDescription, customerPreferences } = req.body;

    if (!baseDescription) {
      return res.status(400).json({
        success: false,
        message: 'Base description is required'
      });
    }

    const result = await dalleService.generateHairstyleVariations(
      baseDescription,
      customerPreferences
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate hairstyle variations',
        error: result.error
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in dalle/hairstyle-variations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/dalle/fade-style
 * @desc    Generate fade hairstyle images
 * @access  Private
 */
router.post('/fade-style', protect, async (req, res) => {
  try {
    const { fadeType, additionalDetails } = req.body;

    if (!fadeType) {
      return res.status(400).json({
        success: false,
        message: 'Fade type is required (e.g., "low fade", "mid fade", "high fade")'
      });
    }

    const result = await dalleService.generateFadeStyle(fadeType, additionalDetails);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate fade style',
        error: result.error
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in dalle/fade-style:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/dalle/hairstyle-from-photo
 * @desc    Generate hairstyle based on user photo using GPT-4 Vision + DALL-E
 * @access  Private
 */
router.post('/hairstyle-from-photo', protect, async (req, res) => {
  try {
    const { image, hairstyleType, additionalDetails, method } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image is required (base64 encoded)'
      });
    }

    if (!hairstyleType) {
      return res.status(400).json({
        success: false,
        message: 'Hairstyle type is required'
      });
    }

    // Use Replicate if method is 'replicate' or if REPLICATE_API_TOKEN is set
    const useReplicate = method === 'replicate' || process.env.REPLICATE_API_TOKEN;
    
    let result;
    if (useReplicate) {
      console.log('Using Replicate for face-preserving generation');
      const hairstyleDescription = `${hairstyleType} ${additionalDetails || ''}`;
      result = await replicateService.generateHairstyle(image, hairstyleDescription);
      
      // Format result to match DALL-E response
      if (result.success) {
        result = {
          success: true,
          images: [{ url: result.image }],
          method: result.method
        };
      }
    } else {
      console.log('Using DALL-E for generation');
      result = await dalleService.generateHairstyleFromPhoto(
        image,
        hairstyleType,
        additionalDetails || ''
      );
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate hairstyle from photo',
        error: result.error
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error in dalle/hairstyle-from-photo:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
