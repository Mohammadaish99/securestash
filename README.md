# 🔐 SecureStash — A Secure & Collaborative File Storage Platform

[![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Framework-Express_4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT_Bearer-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Postman](https://img.shields.io/badge/API_Testing-Postman_Collection-FF6C37?logo=postman&logoColor=white)](https://www.postman.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **SecureStash** is a secure, collaborative cloud storage platform that empowers users to upload, organize, preview, and share files and workspaces in a modern digital vault.  
> **Design Philosophy**: The cryptographic privacy and reliability of **DigiLocker**, the intuitive collaboration and folder management of **Google Drive**, and the aesthetic productivity workflow of **Notion**.

---

## ✨ Key Features

### 🛡️ 1. DigiLocker-Inspired Security & Authentication
- **Strong Cryptographic Password Policy**: Requires 8+ characters, uppercase, lowercase, numeric digits, and special symbols with live animated strength evaluation.
- **Bcrypt Salt Hashing**: OWASP-standard salt rounds ensuring high cryptographic defense against rainbow tables and brute force.
- **Strict Per-User Data Isolation**: Every file and folder is strictly tied to an account ID via Mongoose ObjectId references. Cross-tenant reads and uploads are rejected with `403 Forbidden`.
- **2-Step Password Recovery**: 6-digit cryptographic verification code expiring in 15 minutes.

### 🤝 2. Google Drive-Style Collaboration
- **Interactive Share Modal**: Share any file or folder directly with other users via their registered email.
- **Granular Permissions**: Choose between `View Only` and `Download & View` permissions.
- **Collaborator Management**: View real-time list of who has access with one-click **Revoke Access** capability.
- **Shared With Me View**: Dedicated workspace displaying all files and workspaces shared with you by colleagues.

### 📑 3. Notion-Style Aesthetics & Organization
- **Hierarchical Breadcrumbs**: Clickable folder navigation (`My Stash > Projects > Q3 Reports`).
- **Category Filter Pills**: Instant one-click filtering by `All Items`, `Documents`, `Images`, `Audio & Video`, and `Archives`.
- **Starred / Favorites**: Mark important documents with ⭐ for rapid access.
- **Grid vs. List Views**: Seamlessly switch between detailed table rows and visual card thumbnails.
- **Web URL Stashing**: Directly download and stash any remote file or image from the internet via URL.
- **Glassmorphism Theme**: Ambient glowing background gradients, micro-interactions, and dark mode styling.

---

## 🏗️ Architecture & Monorepo Structure

```
SecureStash/
├── client/                     # React Frontend (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── api/api.js          # Dynamic runtime Axios client & interceptors
│   │   ├── components/
│   │   │   └── ShareModal.jsx  # Collaborative sharing dialog
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Main workspace (files, folders, stats)
│   │   │   ├── Login.jsx       # Glassmorphic login with show/hide password
│   │   │   ├── Register.jsx    # Registration with live security meter
│   │   │   └── ForgotPassword.jsx # 2-step verification code recovery
│   │   ├── App.jsx             # SPA routing & session state
│   │   └── main.jsx
│   └── package.json
│
├── server/                     # Node.js + Express Backend
│   ├── config/db.js            # MongoDB Atlas connection
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT authentication verification
│   ├── models/
│   │   ├── User.js             # User credentials & recovery codes
│   │   ├── File.js             # Metadata, sizes, mime types, stars
│   │   ├── Folder.js           # Workspace hierarchy
│   │   └── Share.js            # Collaboration & permissions schema
│   ├── routes/
│   │   ├── authRoutes.js       # Register, login, recovery
│   │   ├── fileRoutes.js       # Upload, download, preview, star, delete
│   │   ├── folderRoutes.js     # Create, list, rename, delete folders
│   │   └── shareRoutes.js      # Share, list shared, revoke access
│   ├── uploads/                # Local physical storage directory
│   ├── server.js               # Unified Express & SPA server
│   └── package.json
│
├── SecureStash.postman_collection.json   # Ready-to-import Postman collection
├── SecureStash.postman_environment.json  # Postman environment variables
├── publish.js                  # One-click public internet tunnel
├── render.yaml                 # One-click Render.com cloud deployment config
└── package.json                # Root monorepo orchestration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB Atlas**: Free cluster connection string or local MongoDB instance

### 1. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/your-username/SecureStash.git
cd SecureStash
npm run install:all
```

### 2. Environment Configuration
Create `SecureStash/server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/securestash?retryWrites=true&w=majority
JWT_SECRET=SecureStash_Cryptographic_Secret_2026
```

### 3. Running Locally
Start both backend server and frontend client concurrently:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## 🌐 Instant Public Sharing from Localhost

Want to share your running application with friends or open it on your mobile phone without cloud deployment?

Run:
```bash
npm run publish
```
*(or double-click `publish-online.bat` on Windows)*

SecureStash will automatically build the latest client, launch the server, and output:
- ⚡ **Local Wi-Fi URL** (`http://192.168.x.x:5000`): **Instant ~0.1s response** on any phone connected to the same Wi-Fi.
- 🌐 **Public Worldwide URL**: Accessible from any device on mobile data worldwide.

---

## 📬 Postman API Testing Guide

SecureStash includes a fully documented, ready-to-import **Postman Collection v2.1**:

1. Open **Postman**.
2. Click **Import** &rarr; select `SecureStash.postman_collection.json` and `SecureStash.postman_environment.json`.
3. Select the **SecureStash Environment**.
4. Open `1. Authentication > Register User` or `Login User` and click **Send**.
   - *The Postman test script automatically captures the returned JWT token and stores it in `{{token}}`!*
5. All subsequent requests in **Folders**, **Files**, and **Sharing & Collaboration** will automatically use your authentication token!

### API Overview
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register user with strong password validation | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT | No |
| `POST` | `/api/auth/forgot-password` | Generate 15-min 6-digit recovery code | No |
| `POST` | `/api/auth/reset-password` | Reset password using recovery code | No |
| `POST` | `/api/folders` | Create a new folder/workspace | Yes |
| `GET` | `/api/folders` | List all folders owned by user | Yes |
| `POST` | `/api/files/upload` | Multipart upload file (up to 50MB) | Yes |
| `POST` | `/api/files/upload-url` | Stash remote file directly from URL | Yes |
| `GET` | `/api/files/preview/:id` | Stream/preview file inline in browser | Yes |
| `GET` | `/api/files/download/:id` | Secure file download (owner or shared) | Yes |
| `PATCH` | `/api/files/:id/star` | Toggle favorite ⭐ star status | Yes |
| `POST` | `/api/shares/file/:id` | Share file with user by email | Yes |
| `POST` | `/api/shares/folder/:id` | Share folder with user by email | Yes |
| `GET` | `/api/shares/files` | Get all files shared with me | Yes |
| `GET` | `/api/shares/folders` | Get all folders shared with me | Yes |
| `DELETE` | `/api/shares/:id` | Revoke collaborator share access | Yes |

---

## ☁️ Production Cloud Deployment (Render / Railway)

SecureStash is pre-configured with `render.yaml` for 1-click cloud deployment:

1. Push this repository to **GitHub**.
2. Log in to [Render.com](https://render.com) &rarr; **New +** &rarr; **Web Service**.
3. Select your repository.
4. Render automatically detects the configuration:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Add your `MONGODB_URI` in the Environment Variables.
6. Click **Deploy** &mdash; your app will be live at `https://securestash.onrender.com`!

---

## 📜 License
Distributed under the **MIT License**. See `LICENSE` for more information.
