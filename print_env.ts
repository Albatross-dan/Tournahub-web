import dotenv from 'dotenv';
dotenv.config();

console.log("=== Environment Keys ===");
for (const key of Object.keys(process.env)) {
  if (key.includes("SUPABASE") || key.includes("ROLE") || key.includes("SERVICE") || key.includes("VITE")) {
    const value = process.env[key];
    console.log(`${key}: ${value ? value.substring(0, 15) + "..." : "empty"}`);
  }
}
