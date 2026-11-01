# SecureStash Official Cloud Deployment Guide

SecureStash is designed for **Unified Fullstack Deployment** on [Render](https://render.com).
The frontend and backend run together under a single domain (`https://securestash.onrender.com`), eliminating CORS issues, multi-service latency, and payload limits.

---

## Why Render Unified Hosting is the Best Choice

1. **Single URL for Everything**: Both the React client and Express API run on `https://securestash.onrender.com`.
2. **Zero CORS Errors**: Because frontend and backend share the exact same origin, browser CORS blocks cannot happen.
3. **No 4.5 MB Serverless Limits**: Unlike Vercel (which caps uploads at 4.5 MB), Render allows direct streaming of files up to 50 MB into MongoDB Atlas GridFS.
4. **Persistent Cloud Vault**: Files are encrypted with AES-256 and stored in MongoDB Atlas GridFS, surviving container restarts.
5. **Real-time Email OTPs**: Direct HTTPS delivery via Brevo & Gmail SMTP with zero buffering.

---

## 1-Click Deployment Steps on Render

### Step 1: Push Repository to GitHub
Ensure your latest code is pushed to your GitHub repository:
```bash
git add .
git commit -m "Configure Render unified fullstack deployment"
git push origin master
```

### Step 2: Create Web Service on Render
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** &rarr; **Web Service**.
3. Select your GitHub repository (`Mohammadaish99/securestash`).
4. Configure the service settings:
   - **Name**: `securestash`
   - **Region**: Closest to you (e.g. Singapore / Frankfurt / Oregon)
   - **Branch**: `master`
   - **Root Directory**: *(Leave empty / blank)*
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### Step 3: Add Environment Variables
Under **Environment Variables**, add:
- `NODE_ENV`: `production`
- `PORT`: `5000`
- `MONGODB_URI`: `your_mongodb_atlas_connection_string`
- `JWT_SECRET`: `your_random_secret_string`
- `CLIENT_URL`: `*`
- `EMAIL_USER`: `your_email@gmail.com`
- `EMAIL_PASS`: `your_gmail_app_password`
- `BREVO_API_KEY`: `your_brevo_api_key`

### Step 4: Click "Deploy Web Service"
Render will:
1. Build the React frontend with Vite into `SecureStash/client/dist`.
2. Install server dependencies.
3. Start the Express server.
4. Express serves the frontend at `/` and the API at `/api`.

Your app is live at: **`https://securestash.onrender.com`**
