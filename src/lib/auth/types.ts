export type Profile = {
  wallet: string;
  pseudo: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: "user" | "admin";
};
