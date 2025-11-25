const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/barbers');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: barber-{id}-{timestamp}.{ext}
    const ext = path.extname(file.originalname);
    const filename = `barber-${req.params.id}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max
  }
});

// Upload barber image
const uploadBarberImage = async (req, res) => {
  try {
    const barberId = req.params.id;
    
    // Verify barber exists
    const barberResult = await pool.query(
      'SELECT id, image_url FROM barbers WHERE id = $1',
      [barberId]
    );
    
    if (barberResult.rows.length === 0) {
      // Clean up uploaded file
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Barber not found'
      });
    }
    
    const oldImageUrl = barberResult.rows[0].image_url;
    
    // Delete old image if exists
    if (oldImageUrl) {
      const oldImagePath = path.join(__dirname, '../../', oldImageUrl);
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
    }
    
    // Update barber with new image URL
    const imageUrl = `/uploads/barbers/${req.file.filename}`;
    await pool.query(
      'UPDATE barbers SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [imageUrl, barberId]
    );
    
    res.json({
      success: true,
      message: 'Barber image uploaded successfully',
      data: {
        imageUrl
      }
    });
  } catch (error) {
    console.error('Error uploading barber image:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error cleaning up file:', err);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
};

// Delete barber image
const deleteBarberImage = async (req, res) => {
  try {
    const barberId = req.params.id;
    
    // Get current image URL
    const barberResult = await pool.query(
      'SELECT image_url FROM barbers WHERE id = $1',
      [barberId]
    );
    
    if (barberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Barber not found'
      });
    }
    
    const imageUrl = barberResult.rows[0].image_url;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Barber has no image to delete'
      });
    }
    
    // Delete file from filesystem
    const imagePath = path.join(__dirname, '../../', imageUrl);
    if (fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch (err) {
        console.error('Error deleting image file:', err);
      }
    }
    
    // Update database
    await pool.query(
      'UPDATE barbers SET image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [barberId]
    );
    
    res.json({
      success: true,
      message: 'Barber image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting barber image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
};

module.exports = {
  upload,
  uploadBarberImage,
  deleteBarberImage
};
