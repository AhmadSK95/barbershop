# Replicate Setup Guide for Face-Preserving Hairstyle Generation

## What is Replicate?

Replicate provides cloud-hosted AI models that can preserve face identity while changing hairstyles. This gives MUCH better results than DALL-E for the barbershop app.

## Cost

- **Pay-as-you-go**: ~$0.10-0.50 per generation
- **No monthly fee**: Only pay for what you use
- **Much cheaper than running your own GPU**

## Setup Steps

### 1. Create Replicate Account

1. Go to https://replicate.com
2. Sign up with GitHub or email
3. Add payment method (required for API access)

### 2. Get API Token

1. Go to https://replicate.com/account/api-tokens
2. Click "Create token"
3. Copy your token (starts with `r8_...`)

### 3. Add Token to .env

Open `/Users/moenuddeenahmadshaik/Desktop/barbershop/.env` and add:

```bash
REPLICATE_API_TOKEN=r8_your_token_here
```

### 4. Restart Backend

```bash
cd /Users/moenuddeenahmadshaik/Desktop/barbershop
docker-compose restart backend
```

## How It Works

The system will automatically use Replicate when the token is set:

1. **InstantID** (tried first) - Best for face preservation
2. **IP-Adapter FaceID** (fallback) - Also excellent 
3. **ControlNet** (last resort) - Good for structure

If Replicate fails or token is not set, it falls back to DALL-E.

## Models Used

### InstantID
- **Best for**: Exact face preservation
- **Speed**: ~30 seconds
- **Cost**: ~$0.30 per generation
- **Quality**: ⭐⭐⭐⭐⭐

### IP-Adapter FaceID
- **Best for**: Style transfer with face preservation
- **Speed**: ~25 seconds  
- **Cost**: ~$0.20 per generation
- **Quality**: ⭐⭐⭐⭐

### ControlNet
- **Best for**: Structure preservation
- **Speed**: ~20 seconds
- **Cost**: ~$0.15 per generation
- **Quality**: ⭐⭐⭐⭐

## Testing

After setup, test it:

1. Login to the app
2. Go to Virtual Try-On
3. Upload your photo
4. Click "Generate Top 3 Styles"
5. Check backend logs: `docker logs barbershop_backend --tail 20`
6. You should see: "Using Replicate for face-preserving generation"

## Monitoring Usage

- View usage: https://replicate.com/account/billing
- Set spending limits in account settings
- Each generation is logged with cost

## Troubleshooting

### "Replicate API token not configured"
- Check .env file has `REPLICATE_API_TOKEN=r8_...`
- Restart backend: `docker-compose restart backend`

### "Authentication failed"
- Token expired or invalid
- Generate new token at https://replicate.com/account/api-tokens

### Generation fails
- Check credits/payment method at https://replicate.com/account/billing
- View error in backend logs: `docker logs barbershop_backend`

## Cost Management

**Estimated costs for barbershop:**
- 10 generations/day = ~$3/day = $90/month
- 50 generations/day = ~$15/day = $450/month
- 100 generations/day = ~$30/day = $900/month

**Tips to reduce costs:**
- Cache generated results
- Limit generations per user (rate limiting)
- Show preview before generating all 3 styles
- Use DALL-E for less critical previews

## Alternative: Run Your Own

If you have high volume (>1000/day), consider:
- AWS EC2 with GPU: ~$1-3/hour
- RunPod: ~$0.50-1/hour  
- Own hardware: Initial cost but free after

But Replicate is easiest to start with!
