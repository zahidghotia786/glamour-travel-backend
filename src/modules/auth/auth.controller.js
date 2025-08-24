import { registerUser, loginUser } from "./auth.service.js";

// Registration
export const register = async (req, res) => {
  try {
    const { token, user } = await registerUser(req.body);
    res.json({
      message: "User registered successfully",
      token,
      role: user.role,
      user,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { token, user } = await loginUser(req.body);
    res.json({
      message: "Login successful",
      token,
      role: user.role,
      user,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
