import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "de", "en", "es", "fr", "ja", "zh"],
  defaultLocale: "en",
});
