export const appearanceThemes = [
  { id: "evergreen", label: "Evergreen", accent: "#315e56", sidebar: "#182e38", canvas: "#f4f6f8", soft: "#e8f2ef" },
  { id: "rose", label: "Rosewood", accent: "#9a4f62", sidebar: "#3b2630", canvas: "#f8f3f5", soft: "#f5e7ec" },
  { id: "cocoa", label: "Cocoa", accent: "#8a5b3d", sidebar: "#352b26", canvas: "#f7f4f0", soft: "#f2e9df" },
  { id: "ocean", label: "Ocean", accent: "#2f718a", sidebar: "#18313d", canvas: "#f1f6f8", soft: "#e2f0f5" },
  { id: "plum", label: "Plum", accent: "#765787", sidebar: "#30293a", canvas: "#f6f3f8", soft: "#eee7f3" },
  { id: "slate", label: "Slate", accent: "#526b78", sidebar: "#25343b", canvas: "#f2f5f6", soft: "#e6edf0" },
];

export const defaultAppearance = { themeId: "evergreen", density: "comfortable", showTips: true };

export function resolveAppearance(value = {}) {
  const legacy = appearanceThemes.find((theme) => theme.accent === value.accent);
  const theme = appearanceThemes.find((item) => item.id === value.themeId) || legacy || appearanceThemes[0];
  return { ...defaultAppearance, ...value, themeId: theme.id, theme };
}
