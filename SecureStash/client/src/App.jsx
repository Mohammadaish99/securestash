import { useState } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";

function App() {
  const [page, setPage] = useState(
    localStorage.getItem("securestash_token") ? "dashboard" : "login"
  );
  const [authEmail, setAuthEmail] = useState("");

  const handleLoginSuccess = () => {
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("securestash_token");
    localStorage.removeItem("securestash_user");
    setPage("login");
  };

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
}

export default App;