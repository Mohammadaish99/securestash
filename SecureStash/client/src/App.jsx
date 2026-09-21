import { useState, useEffect } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import SharedViewer from "./pages/SharedViewer";
import ErrorBoundary from "./components/ErrorBoundary";

function parseSharedTarget() {
  if (typeof window === "undefined") return null;

  // 1. Check Hash: e.g. #shared-file-29147f77400d7e00a531d305 or #shared-folder-...
  const hash = window.location.hash || "";
  if (hash.startsWith("#shared-")) {
    const raw = hash.replace("#shared-", "");
    const dashIndex = raw.indexOf("-");
    if (dashIndex !== -1) {
      const type = raw.substring(0, dashIndex);
      const id = raw.substring(dashIndex + 1);
      if (id && (type === "file" || type === "folder")) {
        return { type, id };
      }
    }
  }

  // 2. Check Path: e.g. /share/file/29147f77400d7e00a531d305
  const path = window.location.pathname || "";
  const match = path.match(/^\/share\/(file|folder)\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return { type: match[1], id: match[2] };
  }

  return null;
}

function App() {
  const [sharedTarget, setSharedTarget] = useState(parseSharedTarget());
  const [page, setPage] = useState(
    localStorage.getItem("securestash_token") ? "dashboard" : "login"
  );
  const [authEmail, setAuthEmail] = useState("");

  useEffect(() => {
    const handleLocationChange = () => {
      setSharedTarget(parseSharedTarget());
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const handleLoginSuccess = () => {
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("securestash_token");
    localStorage.removeItem("securestash_user");
    setPage("login");
  };

  const handleLeaveShared = () => {
    if (window.location.hash) {
      window.location.hash = "";
    }
    setSharedTarget(null);
    if (!localStorage.getItem("securestash_token")) {
      setPage("login");
    } else {
      setPage("dashboard");
    }
  };

  const renderContent = () => {
    // If a shared link is opened, display the SharedViewer immediately
    if (sharedTarget) {
      return (
        <SharedViewer
          target={sharedTarget}
          onGoToApp={handleLeaveShared}
        />
      );
    }

    if (page === "forgot-password") {
      return (
        <ForgotPassword
          onBackToLogin={(email) => {
            if (email) setAuthEmail(email);
            setPage("login");
          }}
        />
      );
    }

    if (page === "register") {
      return (
        <Register
          onLogin={(email) => {
            if (email) setAuthEmail(email);
            setPage("login");
          }}
          onSuccess={handleLoginSuccess}
        />
      );
    }

    if (page === "dashboard") {
      return <Dashboard onLogout={handleLogout} />;
    }

    return (
      <Login
        initialEmail={authEmail}
        onRegister={() => setPage("register")}
        onForgotPassword={() => setPage("forgot-password")}
        onSuccess={handleLoginSuccess}
      />
    );
  };

  return <ErrorBoundary>{renderContent()}</ErrorBoundary>;
}

export default App;