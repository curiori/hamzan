import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import type { ExpoConfig } from "expo/config";
import { variantConfig } from "../../app.config";
import { ja } from "../../src/i18n/ja";

const json = (path: string) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const base = (): ExpoConfig => json("app.json").expo;

describe("build variants", () => {
  test("production has the store id and no test tools", () => {
    const c = variantConfig(base(), "production");
    expect(c.name).toBe("はむ算");
    // VoiceOver and Siri may read 算 here as さん
    expect(c.ios?.infoPlist?.CFBundleSpokenName).toBe("はむざん");
    // without it, eas build asks and writes the resolved ios config back into app.json, doubling its arrays
    expect(c.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
    expect(c.ios?.bundleIdentifier).toBe("app.curiori.hamzan");
    expect(c.ios?.supportsTablet).toBe(true);
    expect(c.extra?.enableTestTools).toBe(false);
  });

  test("development sits beside it with its own id and the test tools", () => {
    const c = variantConfig(base(), "development");
    expect(c.name).toBe("はむ算 dev");
    expect(c.ios?.bundleIdentifier).toBe("app.curiori.hamzan.dev");
    expect(c.scheme).toBe("hamzan-dev");
    expect(c.extra?.enableTestTools).toBe(true);
  });

  test("Expo Go, the web preview and local exports keep today's config", () => {
    const b = base();
    const c = variantConfig(b, undefined);
    expect([c.name, c.ios?.bundleIdentifier, c.scheme]).toEqual([b.name, b.ios?.bundleIdentifier, b.scheme]);
    expect(c.extra?.enableTestTools).toBe(true);
    // the project id `eas init` writes into app.json stays in every variant
    const linked = { ...b, extra: { ...b.extra, eas: { projectId: "p-1" } } };
    for (const v of [undefined, "development", "production"]) expect(variantConfig(linked, v).extra?.eas).toEqual({ projectId: "p-1" });
  });

  test("the app's own texts use the name on the home screen", () => {
    expect(ja.appName).toBe(base().name);
  });

  test("a misspelt variant stops the build", () => {
    expect(() => variantConfig(base(), "prod")).toThrow("APP_VARIANT");
  });
});

describe("EAS and the iPad", () => {
  test("eas.json builds the two variants for registered devices, with build numbers kept by EAS", () => {
    const eas = json("eas.json");
    expect(eas.cli.appVersionSource).toBe("remote");
    expect(eas.build.production).toMatchObject({ distribution: "internal", autoIncrement: true, env: { APP_VARIANT: "production" } });
    expect(eas.build.development).toMatchObject({ developmentClient: true, distribution: "internal", env: { APP_VARIANT: "development" } });
  });

  test("iPad turns every way while the iPhone stays upright", () => {
    const app = base();
    expect(app.orientation).toBe("portrait");
    expect([...(app.ios?.infoPlist?.["UISupportedInterfaceOrientations~ipad"] ?? [])].sort()).toEqual([
      "UIInterfaceOrientationLandscapeLeft",
      "UIInterfaceOrientationLandscapeRight",
      "UIInterfaceOrientationPortrait",
      "UIInterfaceOrientationPortraitUpsideDown",
    ]);
  });
});
