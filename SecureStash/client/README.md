# 🎨 SecureStash Client — React 19 Frontend

The client interface for **SecureStash**, built using **React 19**, **Vite**, and **Tailwind CSS**.

---

## ⚡ Tech Stack

- **Framework**: React 19 (SPA)
- **Bundler**: Vite 8 with HMR
- **Styling**: Tailwind CSS v4 with custom 3D glassmorphic styling
- **API Client**: Axios with dynamic runtime base URL resolution and 401 session expiration interceptors
- **Icons**: Responsive Unicode emojis & embedded SVGs

---

## 📁 Key Components & Pages

- **`src/pages/Dashboard.jsx`**: Main user workspace featuring:
  - File and folder lists with instant category filtering
  - In-App File Preview Modal (Photos, PDFs, Video, Audio, Documents)
  - Star / Favorites toggling
  - Storage consumption meter
  - Collaborative sharing triggers
- **`src/pages/Login.jsx`**: Dual-mode login with standard Password or Passwordless Email OTP.
- **`src/pages/Register.jsx`**: Account creation with live animated password strength validator.
- **`src/pages/ForgotPassword.jsx`**: 2-step OTP password recovery flow.
- **`src/pages/SharedViewer.jsx`**: Public shared file/folder viewer with direct download and preview.
- **`src/components/ShareModal.jsx`**: Collaborative sharing modal with granular permission controls (`View Only` vs `Download & View`).
- **`src/components/ErrorBoundary.jsx`**: Application-level error boundary preventing full app crashes.

---

## 🛠️ Development

Run Vite development server:
```bash
npm run dev
```

Build production bundle for deployment:
```bash
npm run build
```
*(Outputs optimized assets to `dist/` ready to be served by the Express backend)*
