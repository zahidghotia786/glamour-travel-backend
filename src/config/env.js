import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") }); // always load from project root

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM
  },
  urls: {
    frontend: process.env.FRONTEND_URL,
    backend: process.env.BACKEND_URL
  },
  rayna: {
    baseUrl: process.env.RAYNA_BASE_URL,
    token: process.env.RAYNA_ACCESS_TOKEN,
    imageRoot: process.env.RAYNA_IMAGE_ROOT
  }
};
