# Careers/Hiring Feature Documentation

## Overview
Added a complete job application system allowing potential candidates to apply for positions at Balkan Barbers through the website.

## What Was Built

### Backend Components

1. **Environment Variable** (`backend/.env`)
   - Added `ROOT_EMAIL=ahmad2609.as@gmail.com` - receives all job applications

2. **Email Service** (`backend/src/utils/sesEmail.js`)
   - New function: `sendJobApplicationEmail()`
   - Sends beautiful HTML email notifications to ROOT_EMAIL
   - Includes applicant details, position, message, and resume status
   - Uses AWS SES for email delivery

3. **Controller** (`backend/src/controllers/careersController.js`)
   - `submitApplication()` - Handles job application submissions
   - Validates all input fields (name, email, phone, position)
   - Handles optional resume file upload (PDF, DOC, DOCX)
   - File size limit: 5MB
   - Sends email notification to admin

4. **Routes** (`backend/src/routes/careersRoutes.js`)
   - `POST /api/careers/apply` - Public endpoint for job applications
   - Uses multer middleware for file upload handling
   - Stores files in memory (buffer)

5. **Server Integration** (`backend/src/server.js`)
   - Registered `/api/careers` routes

### Frontend Components

1. **Careers Page** (`src/pages/CareersPage.js`)
   - Public page (no login required)
   - Displays open positions with icons
   - Application form with:
     - Full Name (required)
     - Email Address (required)
     - Phone Number (required)
     - Position dropdown (required): Barber, Receptionist, Manager, Other
     - Cover Letter/Message (optional)
     - Resume upload (optional): PDF, DOC, DOCX, max 5MB
   - Success screen after submission
   - "Why Join Balkan Barbers?" benefits section

2. **Careers Page CSS** (`src/pages/CareersPage.css`)
   - Responsive design
   - Matching barbershop theme (gold/brown color scheme)
   - Mobile-optimized layouts

3. **App Router** (`src/App.js`)
   - Added `/careers` route (public access)

4. **HomePage Footer** (`src/pages/HomePage.js` + `HomePage.css`)
   - Added professional footer with 4 sections:
     - Branding
     - Quick links
     - Contact information
     - **Hiring section with prominent "We're Hiring!" badge**
   - Green gradient badge for "We're Hiring!" to stand out
   - "View Open Positions" button navigates to `/careers`

## User Flow

1. **Visitor discovers hiring opportunity:**
   - Sees "We're Hiring!" badge in homepage footer
   - Clicks "View Open Positions" button

2. **Visitor views careers page:**
   - Reads about open positions
   - Reviews benefits of joining the team
   - Decides to apply

3. **Visitor submits application:**
   - Fills out required fields (name, email, phone, position)
   - Optionally adds cover letter message
   - Optionally uploads resume (PDF/DOC/DOCX)
   - Clicks "Submit Application"

4. **System processes application:**
   - Validates all inputs
   - Validates file type and size (if uploaded)
   - Sends notification email to `ahmad2609.as@gmail.com`

5. **Admin receives notification:**
   - Beautiful HTML email with all applicant details
   - Includes applicant's name, email, phone, position applied
   - Shows cover letter message if provided
   - Notes if resume was attached
   - Admin can reply directly to applicant's email

6. **Visitor sees confirmation:**
   - Success message displayed
   - Option to submit another application

## Email Configuration

The system uses AWS SES (already configured) to send emails:
- **From:** `EMAIL_FROM` (ahmad2609.as@gmail.com)
- **To:** `ROOT_EMAIL` (ahmad2609.as@gmail.com)
- **Subject:** "🎯 New Job Application - [Position]"

### Email Template Features
- Professional HTML design matching Balkan Barbers branding
- Dark gradient header with green accent
- Applicant information in styled card format
- Cover letter displayed in highlighted section
- Resume status clearly indicated
- Timestamp of application submission
- Responsive design for mobile email clients

## File Upload Handling

- **Supported formats:** PDF, DOC, DOCX
- **Max size:** 5MB
- **Storage:** Memory buffer (not saved to disk)
- **Validation:** Client-side and server-side

### Note on Resume Attachments
The current implementation validates and receives resume files but does NOT attach them to the email due to AWS SES SendEmailCommand limitations. To enable attachments:
- Need to implement SendRawEmailCommand with MIME multipart format
- Alternative: Store resumes in S3 and include download link in email

For now, the email notes whether a resume was uploaded, and the admin can:
1. Reply to the applicant requesting the resume
2. The applicant's email is included, so direct contact is easy

## API Endpoint

### POST /api/careers/apply
**Access:** Public (no authentication required)

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `name` (string, required): Full name
  - `email` (string, required): Email address
  - `phone` (string, required): Phone number
  - `position` (string, required): One of: Barber, Receptionist, Manager, Other
  - `message` (string, optional): Cover letter/message
  - `resume` (file, optional): Resume file (PDF/DOC/DOCX, max 5MB)

**Response:**
```json
{
  "success": true,
  "message": "Application submitted successfully! We will review your application and get back to you soon."
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

## Validation Rules

- **Name:** 2-50 characters, letters/spaces/hyphens only
- **Email:** Valid RFC 5322 email format
- **Phone:** 10-15 digits
- **Position:** Must be one of the predefined options
- **Message:** Optional, no validation
- **Resume:** Optional, PDF/DOC/DOCX, max 5MB

## Testing

### Manual Testing Steps

1. **Test navigation:**
   ```bash
   # Visit homepage
   http://localhost:3000
   
   # Scroll to footer
   # Click "View Open Positions" in "We're Hiring!" section
   ```

2. **Test careers page:**
   ```bash
   # Should navigate to
   http://localhost:3000/careers
   
   # Verify all sections render correctly
   ```

3. **Test application submission (without resume):**
   - Fill in: Name, Email, Phone, Position
   - Leave message empty
   - Don't upload resume
   - Submit and verify success message

4. **Test application submission (with resume):**
   - Fill in all required fields
   - Add cover letter message
   - Upload PDF resume
   - Submit and verify success message

5. **Test validation:**
   - Try submitting with missing required fields
   - Try uploading invalid file type (e.g., .txt)
   - Try uploading file > 5MB
   - Verify error messages

6. **Test email delivery:**
   - Check `ahmad2609.as@gmail.com` inbox
   - Verify email received with correct details
   - Check HTML rendering in email client

### Backend Testing (curl)

```bash
# Test without resume
curl -X POST http://localhost:5001/api/careers/apply \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "phone=5551234567" \
  -F "position=Barber" \
  -F "message=I love cutting hair!"

# Test with resume
curl -X POST http://localhost:5001/api/careers/apply \
  -F "name=Jane Smith" \
  -F "email=jane@example.com" \
  -F "phone=5559876543" \
  -F "position=Receptionist" \
  -F "message=Excited to join your team!" \
  -F "resume=@/path/to/resume.pdf"
```

## Dependencies Added

- **Backend:** `multer@^1.4.5-lts.1` - File upload middleware

## Security Features

- Rate limiting applied to all `/api` routes (already configured)
- Input validation and sanitization
- File type validation (whitelist approach)
- File size limits
- SQL injection prevention (parameterized queries)
- XSS protection (React auto-escaping)
- CORS restrictions

## Future Enhancements

1. **Resume Attachment Support:**
   - Implement SendRawEmailCommand for AWS SES
   - Or store resumes in S3 and include download links

2. **Application Management:**
   - Admin dashboard to view all applications
   - Database table to store applications
   - Application status tracking (pending, reviewing, accepted, rejected)

3. **Automated Responses:**
   - Send confirmation email to applicant
   - Send rejection/interview invitation emails

4. **Advanced Features:**
   - Application scoring/filtering
   - Interview scheduling integration
   - Background check integration
   - Multiple file uploads (portfolio, certifications)

## File Structure

```
barbershop/
├── backend/
│   ├── .env (updated: added ROOT_EMAIL)
│   ├── src/
│   │   ├── controllers/
│   │   │   └── careersController.js (new)
│   │   ├── routes/
│   │   │   └── careersRoutes.js (new)
│   │   ├── utils/
│   │   │   └── sesEmail.js (updated: added sendJobApplicationEmail)
│   │   └── server.js (updated: registered careers routes)
│   └── package.json (updated: added multer)
├── src/
│   ├── pages/
│   │   ├── CareersPage.js (new)
│   │   ├── CareersPage.css (new)
│   │   ├── HomePage.js (updated: added footer)
│   │   └── HomePage.css (updated: added footer styles)
│   └── App.js (updated: added /careers route)
└── CAREERS-FEATURE.md (this file)
```

## Notes

- The backend server needs to be restarted to load the new routes
- Frontend hot-reload should pick up new components automatically
- AWS SES must be configured (already done)
- ROOT_EMAIL must be verified in AWS SES (if in sandbox mode)
- All emails use the existing AWS SES configuration

## Support

For issues or questions:
1. Check backend logs for errors: `docker-compose logs -f backend`
2. Check frontend console for errors
3. Verify AWS SES configuration in `.env`
4. Ensure ROOT_EMAIL is verified in AWS SES console
