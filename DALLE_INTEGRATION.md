# DALL-E Integration for Barbershop

## ⚠️ Security First

**IMPORTANT**: Your API key was exposed. Follow these steps immediately:

1. Go to https://platform.openai.com/api-keys
2. Revoke the exposed key
3. Generate a new API key
4. Add it to `.env` file (replace `{{your_new_api_key_here}}`)

## Setup

### 1. Add API Key to Environment
Edit `.env` file:
```bash
OPENAI_API_KEY=sk-proj-YOUR_NEW_KEY_HERE
```

### 2. Install Dependencies
Already installed! The `openai` package is ready to use.

### 3. Restart Backend
```bash
cd backend
npm start
```

## API Endpoints

All endpoints require authentication (Bearer token).

### 1. Generate Custom Hairstyle
**POST** `/api/dalle/generate`

```json
{
  "prompt": "Modern short haircut for men with textured top",
  "options": {
    "quality": "standard",  // or "hd"
    "size": "1024x1024",
    "style": "natural"      // or "vivid"
  }
}
```

### 2. Generate Fade Style
**POST** `/api/dalle/fade-style`

```json
{
  "fadeType": "mid fade",
  "additionalDetails": "with line up and beard trim"
}
```

### 3. Generate Hairstyle Variations
**POST** `/api/dalle/hairstyle-variations`

```json
{
  "baseDescription": "Classic pompadour",
  "customerPreferences": "with side part, professional business look"
}
```

## Testing

Run the test script:
```bash
node test-dalle.js
```

## Example Frontend Integration

```javascript
// In your React component
const generateHairstyle = async (fadeType) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      'http://localhost:5001/api/dalle/fade-style',
      {
        fadeType: fadeType,
        additionalDetails: 'professional barbershop style'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    const imageUrl = response.data.images[0].url;
    // Display the image
    setGeneratedImage(imageUrl);
  } catch (error) {
    console.error('Error generating hairstyle:', error);
  }
};
```

## Costs

- **DALL-E 3 Standard**: $0.040 per image (1024x1024)
- **DALL-E 3 HD**: $0.080 per image (1024x1024)

Monitor your usage at: https://platform.openai.com/usage

## Files Created

- `backend/services/dalle.js` - DALL-E service
- `backend/src/routes/dalleRoutes.js` - API routes
- `test-dalle.js` - Test script
- `.env` - API key configuration (updated)
