const { sendJobApplicationEmail } = require('../utils/sesEmail');
const { validateEmail, validatePhone, validateName } = require('../utils/validation');

// @desc    Submit job application
// @route   POST /api/careers/apply
// @access  Public
const submitApplication = async (req, res) => {
  try {
    console.log('Careers application received:', {
      body: req.body,
      file: req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : null
    });
    
    const { name, email, phone, position, message } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !position) {
      console.log('Missing required fields:', { name: !!name, email: !!email, phone: !!phone, position: !!position });
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, phone, and position'
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate phone format
    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number (10-15 digits)'
      });
    }

    // Validate name
    if (!validateName(name)) {
      return res.status(400).json({
        success: false,
        message: 'Name must be 2-50 characters and contain only letters, spaces, and hyphens'
      });
    }

    // Validate position
    const validPositions = ['Barber', 'Receptionist', 'Manager', 'Other'];
    if (!validPositions.includes(position)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid position'
      });
    }

    // Handle resume file if uploaded
    let hasResume = false;
    let resumeName = null;
    let resumeBuffer = null;
    let resumeType = null;

    if (req.file) {
      hasResume = true;
      resumeName = req.file.originalname;
      resumeBuffer = req.file.buffer;
      resumeType = req.file.mimetype;

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(resumeType)) {
        return res.status(400).json({
          success: false,
          message: 'Resume must be a PDF, DOC, or DOCX file'
        });
      }

      // Validate file size (5MB max)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Resume file size must be less than 5MB'
        });
      }
    }

    // Prepare application details
    const applicationDetails = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      position,
      message: message?.trim() || '',
      hasResume,
      resumeName,
      resumeBuffer,
      resumeType
    };

    // Send notification email to admin
    await sendJobApplicationEmail(applicationDetails);

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully! We will review your application and get back to you soon.'
    });

  } catch (error) {
    console.error('Error submitting job application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application. Please try again later.'
    });
  }
};

module.exports = {
  submitApplication
};
