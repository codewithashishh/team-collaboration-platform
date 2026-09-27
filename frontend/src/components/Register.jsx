import { useState } from "react";
import api from "../services/api";

function Register({
  onRegister,
  onLoginClick,
}) {
  const [name, setName] = useState("");
  const [username, setUsername] =
    useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", {
        name,
        username,
        email,
        password,
      });

      alert(
        "Registration successful. Please login."
      );

      onRegister();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Registration failed"
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

        <h2>Register</h2>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          required
        />

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
          required
        />

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
            ? "Creating..."
            : "Register"}
        </button>

        <p>
          Already have an account?

          <button
            type="button"
            className="link-button"
            onClick={onLoginClick}
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
}

export default Register;