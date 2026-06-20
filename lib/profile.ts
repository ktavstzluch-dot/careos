export type CareOSUserProfile = {
  email: string;
  displayName: string;
  avatarUrl: string;
};

type CareOSUserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

function getStringMetadata(user: CareOSUserLike, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function formatEmailUsername(email?: string | null) {
  if (!email) return "";
  const username = email.split("@")[0]?.trim();
  if (!username) return "";

  return username
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getDisplayNameFromUser(user: CareOSUserLike): string {
  return (
    getStringMetadata(user, "full_name") ||
    getStringMetadata(user, "display_name") ||
    formatEmailUsername(user.email) ||
    "CareOS Family"
  );
}

export function getAvatarUrlFromUser(user: CareOSUserLike): string {
  return getStringMetadata(user, "avatar_url");
}

export function getProfileFromUser(user: CareOSUserLike): CareOSUserProfile {
  return {
    email: user.email || "",
    displayName: getDisplayNameFromUser(user),
    avatarUrl: getAvatarUrlFromUser(user),
  };
}
