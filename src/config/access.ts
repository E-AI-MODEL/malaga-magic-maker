export const PRELAUNCH_ACCESS_RESTRICTED =
  (import.meta.env.VITE_PRELAUNCH_ACCESS_MODE ?? "restricted").toLowerCase() !== "open";

export const PRELAUNCH_AUTH_VERSION = "v4-prelaunch-config";

export const PUBLIC_SIGNUP_ENABLED = !PRELAUNCH_ACCESS_RESTRICTED;

export const INVITE_SIGNUP_ENABLED =
  PUBLIC_SIGNUP_ENABLED ||
  (import.meta.env.VITE_INVITE_SIGNUP_MODE ?? "closed").toLowerCase() === "open";
