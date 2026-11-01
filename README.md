# 🔐 SecureStash — Private, Encrypted & Collaborative Cloud Vault

[![Live Demo](https://img.shields.io/badge/Live_App-securestash.onrender.com-00C7B7?style=for-the-badge&logo=render&logoColor=white)](https://securestash.onrender.com)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Mohammadaish99%2Fsecurestash-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Mohammadaish99/securestash)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

[![React 19](https://img.shields.io/badge/Frontend-React_19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Framework-Express_5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB Atlas GridFS](https://img.shields.io/badge/Storage-MongoDB_Atlas_GridFS-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![AES-256](https://img.shields.io/badge/Encryption-AES--256--CBC-E11D48?logo=lock&logoColor=white)](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)

> **SecureStash** is a secure, collaborative cloud vault that empowers users to upload, preview, organize, and share files and workspaces with end-to-end cloud persistence.  
> Combines the cryptographic privacy and reliability of **DigiLocker**, the collaborative power of **Google Drive**, and the modern, tactile aesthetic of **Notion**.

---

## 🌟 Live Demo & Deployment

- 🌐 **Official Live Web App**: [**https://securestash.onrender.com**](https://securestash.onrender.com)
- 🚀 **Fullstack Unified Service**: Frontend (React 19) and Backend (Node.js Express) run together under a single domain with zero CORS issues and permanent cloud storage.

---

## ✨ Core Features

### 🛡️ 1. Military-Grade Cloud Vault & AES-256 Encryption
- **AES-256-CBC Encryption at Rest**: Every document, photo, and file is encrypted in-place using cryptographic AES-256 algorithms before persistence.
- **MongoDB Atlas GridFS Cloud Storage**: Files are permanently preserved in MongoDB Atlas cloud chunks (`vault_uploads`). Uploaded files will **never** disappear when cloud hosting containers restart or sleep.
- **Direct Access Guard**: Direct storage links (`/uploads`) are strictly blocked. All file access requires authenticated decryption through `/api/files/download` or `/api/files/preview`.

### 📱 2. Mobile In-App File Preview & Media Player
- **Interactive File Preview Modal**: Open images (PNG, JPG, SVG, WebP), PDFs, audio, video, and documents directly inside the application.
- **Zero Mobile Popup Blocks**: Eliminates the popup-blocker issues common with mobile browsers (like Instagram WebView or Safari).
- **Direct Download & Full-Tab Options**: Instant single-click downloads or full-screen viewing tabs.

### 🤝 3. Google Drive-Style Collaboration & Sharing
- **Collaborative Sharing Modal**: Share files or entire folders with any registered user by email.
- **Granular Permissions**: Set access to **View Only** or **Download & View**.
- **Public Share Links**: Generate secure external links (`/#shared-file-...` and `/#shared-folder-...`) for friends and collaborators.
- **Dedicated Shared Workspaces**: Manage and revoke shared access at any time.

### ⚡ 4. Real-Time OTP Email Verification & Passwordless Sign-In
- **Instant Email Delivery**: Zero-buffering cloud email dispatch via Brevo HTTPS API and Gmail SMTP.
- **Passwordless 1-Click Login**: Sign in instantly using a 6-digit cryptographic one-time password (OTP) sent straight to your Gmail.
- **2-Step Password Recovery**: Secure password reset with timed 15-minute verification codes.
- **Genuine Email Verification**: Blocks disposable and burner domains via authoritative DNS MX record validation.

### 🎨 5. Notion-Style Aesthetics & Workspace Organization
- **Hierarchical Breadcrumbs**: Seamless nested folder navigation.
- **Category Filters**: Rapid one-click filtering for `All`, `Documents`, `Images`, `Media`, and `Archives`.
- **Favorites & Starred**: Star important documents for instant access.
- **Upload from URL**: Stash any web image or file directly into your vault by pasting its public link.
- **Tactile 3D Glassmorphism**: Polished dark-mode UI with ambient gradient glows and micro-animations.

---

## 🏗️ Architecture & Project Structure

```
SecureStash/
├── SecureStash/
│   ├── client/                     # React 19 Frontend (Vite + Tailwind CSS)
│   │   ├── src/
│   │   │   ├── api/api.js          # Dynamic API client with auto-session refresh
│   │   │   ├── components/
│   │   │   │   ├── ErrorBoundary.jsx # Graceful UI crash protection
│   │   │   │   └── ShareModal.jsx  # Collaborative sharing modal
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.jsx   # Main vault with In-App Preview Modal
│   │   │   │   ├── Login.jsx       # Password & Passwordless OTP login
│   │   │   │   ├── Register.jsx    # User registration with password meter
│   │   │   │   ├── ForgotPassword.jsx # 2-step OTP password recovery
│   │   │   │   └── SharedViewer.jsx   # Public file/folder viewer
│   │   │   ├── App.jsx             # SPA routing & session manager
│   │   │   └── main.jsx
│   │   ├── vercel.json             # Automatic redirect to Render unified app
│   │   └── package.json
│   │
│   └── server/                     # Node.js + Express Backend
│       ├── config/db.js            # MongoDB Atlas connection & auto-reconnect
│       ├── middleware/
│       │   └── authMiddleware.js   # JWT authentication verification
│       ├── models/
│       │   ├── User.js             # User accounts & recovery codes
│       │   ├── File.js             # File metadata & folder references
│       │   ├── Folder.js           # Folder hierarchy
│       │   └── Share.js            # Collaborative permissions schema
│       ├── routes/
│       │   ├── authRoutes.js       # Register, login, OTP dispatch & verification
│       │   ├── fileRoutes.js       # GridFS upload, download, preview, star, delete
│       │   ├── folderRoutes.js     # Folder CRUD operations
│       │   └── shareRoutes.js      # Public & collaborative file sharing
│       ├── utils/
│       │   ├── encryption.js       # AES-256 buffer & in-place encryption
│       │   ├── gridfs.js           # MongoDB Atlas GridFS cloud persistence engine
│       │   ├── mailer.js           # Brevo HTTPS & Gmail SMTP email dispatch
│       │   └── emailVerifier.js    # Disposable filter & DNS MX validation
│       └── server.js               # Unified server (serves React SPA & API)
│
├── otherthings/                    # Project documentation, presentations & offline assets
├── DEPLOYMENT_GUIDE.md             # Complete step-by-step cloud hosting guide
├── render.yaml                     # 1-Click Render.com deployment blueprint
├── vercel.json                     # Seamless edge redirect to Render
└── package.json                    # Root monorepo orchestration
```

---

## 🚀 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection URI or local MongoDB instance

### 1. Clone the Repository
```bash
git clone https://github.com/Mohammadaish99/securestash.git
cd securestash
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Configure Environment Variables
Create a `.env` file inside `SecureStash/server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key_2026
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_16_character_app_password
BREVO_API_KEY=your_brevo_api_key_optional
```

### 4. Run Locally
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api`

---

## ☁️ 1-Click Cloud Deployment (Render Unified Fullstack)

SecureStash is pre-configured with `render.yaml` for a unified fullstack deployment:

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy latest SecureStash fullstack vault"
   git push origin master
   ```
2. Go to [Render Dashboard](https://dashboard.render.com) &rarr; **New +** &rarr; **Web Service**.
3. Select your repository: `Mohammadaish99/securestash`.
4. Render detects the configuration automatically:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Add your `MONGODB_URI` and `JWT_SECRET` in **Environment Variables**.
6. Click **Deploy Web Service** &mdash; your app will be live at `https://securestash.onrender.com`!

---

## 🛡️ API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user with strong password & DNS check | No |
| `POST` | `/api/auth/login` | Sign in with password & receive JWT | No |
| `POST` | `/api/auth/send-login-otp` | Request passwordless 6-digit login OTP | No |
| `POST` | `/api/auth/verify-login-otp`| Sign in via verified email OTP | No |
| `POST` | `/api/auth/forgot-password`| Request password recovery code | No |
| `POST` | `/api/auth/reset-password` | Set new password with verified recovery code | No |
| `GET` | `/api/files` | Get all files in personal vault | Yes |
| `POST` | `/api/files/upload` | Multipart upload to MongoDB Atlas GridFS | Yes |
| `POST` | `/api/files/upload-url` | Stash remote file directly from external URL | Yes |
| `GET` | `/api/files/preview/:id` | Stream & preview decrypted file inline | Yes |
| `GET` | `/api/files/download/:id` | Decrypt and download file attachment | Yes |
| `DELETE` | `/api/files/:id` | Permanently remove file from GridFS & disk | Yes |
| `PATCH` | `/api/files/:id/star` | Toggle favorite ⭐ star status | Yes |
| `GET` | `/api/folders` | List all user folders & hierarchies | Yes |
| `POST` | `/api/folders` | Create a new vault folder | Yes |
| `POST` | `/api/shares/file/:id` | Share file with user by email | Yes |
| `POST` | `/api/shares/folder/:id` | Share workspace folder by email | Yes |

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
