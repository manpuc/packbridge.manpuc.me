import * as Sentry from "@sentry/astro";

Sentry.init({
  dsn: "https://c5a3debfac2b29cc8e5879b29115584f@o4511420012429312.ingest.de.sentry.io/4511528317354064",
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/astro/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
