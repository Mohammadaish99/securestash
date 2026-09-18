# SecureStash Hosting & Deployment Guide

This guide explains how to host SecureStash on modern cloud platforms.

---

## Architecture Overview

SecureStash consists of:
- **Client (Frontend)**: React 19 + Vite + Tailwind CSS
- **Server (Backend)**: Node.js + Express + MongoDB (Mongoose) + Multer

---

## Option 1: Separate Hosting (Recommended)

### 1. Deploy Backend (e.g. on [Render](https://render.com) or [Railway](https://railway.app))

1. Push your repository to GitHub.
2. In Render, click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Root Directory**: `SecureStash/server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Under **Environment Variables**, add:
   - `PORT`: `5000`
   - `MONGODB_URI`: Your MongoDB Atlas connection string (e.g. `mongodb+srv://...`)
   - `JWT_SECRET`: A long random secret string (e.g. `my_super_secret_jwt_key_2026`)
   - `CLIENT_URL`: The URL of your hosted frontend (or `*` to allow all)
6. Click **Deploy**. Render will generate a URL like `https://securestash-api.onrender.com`.

---

### 2. Deploy Frontend (e.g. on [Vercel](https://vercel.com) or [Netlify](https://netlify.com))

1. In Vercel, click **Add New...** > **Project**.
2. Connect your GitHub repository.
3. Configure the build settings:
   - **Root Directory**: `SecureStash/client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: Your backend API URL from step 1 (e.g. `https://securestash-api.onrender.com/api`)
5. Click **Deploy**.

---

## Option 2: Fullstack Unified Deployment (Single Service)

You can host both frontend and backend together on a single Render or Railway Web Service. The backend is configured to automatically serve the client's built assets when deployed together.

1. In Render, create a **Web Service**:
   - **Root Directory**: Leave blank (monorepo root)
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
2. Set Environment Variables:
   - `PORT`: `5000`
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A long random secret string
   - `CLIENT_URL`: `*`
3. Deploy! The server will serve the frontend from `/` and API routes from `/api`.

---

## Features Added & Verified

- **Dynamic Backend URL**: Client dynamically switches between localhost and hosted URL via `VITE_API_URL`.
- **Upload File**: Select and upload any file directly from your computer with real-time feedback.
- **Upload from URL**: Stash images or documents directly by entering an external URL.
- **Delete File**: Permanently remove files from cloud disk and database.
- **Download File**: Direct download via API or token.
- **Open / Preview**: Direct link to view files in a new tab.
- **Live Search**: Instant filtering for files and folders.
- **Dynamic Storage**: Automatic calculation of space used out of 10 GB.
