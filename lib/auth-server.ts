import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/**
 * Helper function to get the current session in server components
 * @returns The current session or null if not authenticated
 */
export async function auth() {
  return await getServerSession(authOptions);
}

