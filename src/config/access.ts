export const PRELAUNCH_ACCESS_RESTRICTED =
  (import.meta.env.VITE_PRELAUNCH_ACCESS_MODE ?? "restricted").toLowerCase() !== "open";

export const PRELAUNCH_AUTH_VERSION = "v4-prelaunch-config";
