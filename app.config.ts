import type { ConfigContext, ExpoConfig } from "expo/config";

// The build variant comes from APP_VARIANT, which each eas.json profile sets (EAS applies it both on this PC and on
// the builder). Without it (Expo Go, the web preview, `expo export`) the app is set up as app.json says, with the
// test tools. The development build sits beside the production one on the same device, under its own id.
export function variantConfig(config: ExpoConfig, variant: string | undefined): ExpoConfig {
  const extra = (testTools: boolean) => ({ ...config.extra, enableTestTools: testTools });
  switch (variant) {
    case undefined:
    case "":
      return { ...config, extra: extra(true) };
    case "production":
      return { ...config, extra: extra(false) };
    case "development":
      return {
        ...config,
        name: `${config.name} dev`,
        scheme: `${String(config.scheme)}-dev`,
        ios: { ...config.ios, bundleIdentifier: `${config.ios?.bundleIdentifier}.dev` },
        extra: extra(true),
      };
    default:
      throw new Error(`APP_VARIANT must be "development" or "production", not "${variant}"`);
  }
}

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  return variantConfig(config as ExpoConfig, process.env.APP_VARIANT);
}