export type PortalView = "home" | "creative" | "archive" | "about";

export const portalHashByView: Record<PortalView, string> = {
  home: "",
  creative: "creative",
  about: "about",
  archive: "archive",
};

export const portalViewByHash: Record<string, PortalView> = {
  "": "home",
  home: "home",
  creative: "creative",
  about: "about",
  archive: "archive",
  work: "archive",
};
