import { useState } from "react";
import api from "../services/api";

function Login({
  onLogin,
  onRegisterClick,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await api.post("/auth/login", {
        email,
        password,
      });

      const me = await api.get("/auth/me");

      onLogin(me.data.user);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <form
        className="auth-box"
        onSubmit={handleSubmit}
      >
        <h1>Team Collaboration</h1>

        <h2>Login</h2>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          required
        />

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Logging in..."
            : "Login"}
        </button>

        <p>
          Don't have an account?

          <button
            type="button"
            className="link-button"
            onClick={onRegisterClick}
          >
            Register
          </button>
        </p>
      </form>
    </div>
  );
}

export default Login;