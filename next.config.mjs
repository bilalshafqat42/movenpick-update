const isDev = process.env.NODE_ENV !== "production";

/*
 * Content-Security-Policy, tuned to what this site actually loads.
 *
 * Deliberately NOT a nonce-based strict CSP: that requires generating a
 * per-request nonce in Proxy (src/proxy.js), whose matcher is currently
 * scoped to /admin-panel only. Widening it to every route on the public
 * marketing site to gain a stricter script-src is a much larger change
 * with real breakage risk, and the actual injection hole this would
 * have contained (unescaped JSON-LD, see src/app/layout.js) is now
 * fixed at the source. So this policy takes the directives that carry
 * real protection at near-zero breakage risk — object-src, base-uri,
 * form-action, frame-ancestors — and keeps 'unsafe-inline' for
 * scripts/styles, which Next.js's hydration and mapbox-gl both require
 * without a nonce.
 *
 * Origins allowlisted below, and why:
 * - api.mapbox.com / events.mapbox.com: mapbox-gl is bundled from npm,
 *   but fetches map styles, tiles, sprites, and glyphs at runtime and
 *   posts telemetry. Omitting these silently breaks the Location map.
 * - blob: in worker-src/child-src: mapbox-gl spawns its tile-decoding
 *   Web Workers from blob: URLs.
 * - *.public.blob.vercel-storage.com: every admin-uploaded image (see
 *   the images.remotePatterns note below).
 * - data: in img-src/font-src: next/image placeholders and inlined fonts.
 */
/*
 * Hosts that may serve images, as a comma-separated list in IMAGE_HOSTS.
 *
 * The central admin panel stores uploaded images somewhere this app does
 * not choose and cannot know at build time. Next.js 16 requires every
 * external image host to be allowlisted explicitly, and the failure is
 * abrupt: next/image throws the moment a field actually holds a URL from
 * an unlisted host. So the moment an editor replaces any image in the
 * panel, every page using it breaks — while the site looked perfect right
 * up to that point, because every default is a local /images path.
 *
 * Set IMAGE_HOSTS to the panel's storage host before editors start
 * uploading, e.g. IMAGE_HOSTS=cdn.refinedubai.com
 *
 * Read at BUILD time, not runtime: changing it requires a rebuild, not
 * just a restart. Wildcards are supported by remotePatterns (*.example.com).
 */
/*
 * On-demand image optimisation. OFF unless explicitly asked for.
 *
 * Turned on briefly and reverted on 27 August 2026 after the live site
 * returned 502. The reasoning for turning it on was that a CDN cache
 * header for /_next/image would mean each variant is encoded once and
 * served from Cloudflare thereafter. Measured against production, that
 * header never took effect:
 *
 *   /images/...     cache-control: ...s-maxage=86400...   cf-cache-status: HIT
 *   /_next/image    cache-control: ...must-revalidate     cf-cache-status: DYNAMIC
 *
 * Next.js sets its own Cache-Control on the image route and it wins over
 * anything declared in headers() below. Without s-maxage, and with
 * must-revalidate, Cloudflare will not cache it — so DYNAMIC means every
 * image request from every visitor passed through to the container.
 *
 * That is exactly the condition behind the original incident: on a
 * 0.5 CPU / 512 MB instance the optimiser returns 502 at three
 * concurrent /_next/image requests, and a browser opens six.
 *
 * Opt-in rather than opt-out, deliberately. Defaulting to on left the
 * safe state depending on an env var being present in the deployment
 * environment; if it is ever missing, the failure is a site that 502s
 * under load. Off by default fails the other way — larger images, which
 * nobody notices.
 *
 * Before setting OPTIMISE_IMAGES=true again, one of these has to be
 * true:
 *
 * - A Cloudflare Cache Rule on /_next/image* with Edge TTL set to
 *   override the origin header, so the caching actually happens; or
 * - a custom images.loader pointing at Cloudflare's own resizing, so
 *   /_next/image is never used and the container never encodes anything;
 * - or an instance with meaningfully more CPU.
 *
 * Verify with `curl -I` that cf-cache-status is HIT, not DYNAMIC, before
 * trusting it.
 */
const optimiseImages = process.env.OPTIMISE_IMAGES === "true";

/*
 * The Cloudflare-resizing path the comment above calls for. Off by default,
 * same reasoning as OPTIMISE_IMAGES: this must not turn on by itself just
 * because the env var happened to be set somewhere. Before setting this to
 * true, confirm on Cloudflare's dashboard that Image Resizing (and "Resize
 * images from any origin", since some sources are the admin panel's media
 * host, not this domain) is actually enabled for this zone — if it is not,
 * every image on the site 404s or errors instead of falling back, which is
 * worse than the current unoptimised-but-working state.
 */
const cloudflareImageResizing = process.env.CLOUDFLARE_IMAGE_RESIZING === "true";

const imageHosts = (process.env.IMAGE_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-eval' is dev-only: Turbopack's HMR runtime needs it. It is
  // never emitted in a production build.
  //
  // googletagmanager.com carries both GTM's own script and, once a tag
  // inside the container loads GA4, gtag.js — both are served from this
  // one host, so no separate Google Analytics script origin is needed
  // here. Only reached at all once a visitor allows the Analytics cookie
  // category (src/components/GoogleTagManager); the origin still has to
  // be allowlisted regardless of that runtime gate, since CSP is evaluated
  // before any application code decides whether to load the script.
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://api.mapbox.com https://www.googletagmanager.com https://www.google-analytics.com${imageHosts
    .map((host) => ` https://${host}`)
    .join("")}`,
  "font-src 'self' data:",
  // google-analytics.com and analytics.google.com (both wildcarded: GA4
  // sends hits to a region-specific subdomain of each) are where gtag.js
  // actually reports to once GTM has loaded it.
  "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'self' https://www.google.com",
  // The high-value, low-risk directives:
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  /*
   * frame-ancestors above supersedes this in modern browsers; kept for
   * older-browser coverage. 'self' rather than DENY so the site can
   * still be framed by its own pages if a future embed needs it.
   */
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  /*
   * No `includeSubDomains` and no `preload` on purpose. Both are hard
   * to reverse, and the production custom domain is not attached yet
   * (the site currently runs on *.vercel.app) — so we cannot yet
   * guarantee every future subdomain will be HTTPS-only. Revisit and
   * strengthen once the real domain is live and verified.
   */
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

/*
 * Redirects declared in the central admin panel's SEO page (RedirectsCard),
 * 18 August 2026 — Phase 6's last unbuilt piece. Fetched once, here, when
 * Next.js loads this config, not per-request: this is the standard
 * next.config `redirects()` API, so an added or changed redirect needs a
 * redeploy to take effect. That trade-off was chosen deliberately over a
 * middleware that checks on every request — a redirect is rare enough that
 * "picks up on the next deploy" is a fine cost for never adding a lookup
 * to every single page view.
 *
 * Never throws and never blocks the build: an unreachable panel at build
 * time means zero redirects that build, exactly as if none had been
 * declared, not a failed deploy.
 */
async function fetchRedirects() {
  const baseUrl = process.env.CONTENT_API_URL;
  const token = process.env.CONTENT_API_TOKEN;

  if (!baseUrl || !token) {
    return [];
  }

  try {
    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/api/v1/seo`);
    url.searchParams.set("site", process.env.SITE_KEY?.trim() || "movenpick");

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, "x-api-key": token },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error("Redirects fetch responded with status:", response.status);
      return [];
    }

    const data = await response.json();
    // The API's own wire shape is { from, to, permanent } — checked
    // against a real response rather than assumed from the Prisma model's
    // column names (fromPath/toPath), which are not what the route emits.
    return (data.redirects ?? []).map((redirect) => ({
      source: redirect.from,
      destination: redirect.to,
      permanent: redirect.permanent,
    }));
  } catch (error) {
    console.error("Redirects fetch failed:", error?.message);
    return [];
  }
}

/** @type {import("next").NextConfig} */
const nextConfig = {
  async redirects() {
    return fetchRedirects();
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        /*
         * Let the CDN cache images.
         *
         * This closes the single biggest behavioural gap between this
         * deployment and the previous Vercel one. On Vercel, images came back
         * with `x-vercel-cache: HIT` — served from their global CDN, having
         * been processed once on Vercel's own image infrastructure rather than
         * by the application. The app effectively never saw image traffic.
         *
         * Render fronts the service with Cloudflare, but Next.js serves files
         * from /public with `cache-control: public, max-age=0`, so Cloudflare
         * reported `cf-cache-status: DYNAMIC` and passed EVERY request through
         * to the container. On a 0.5 CPU instance that is the difference
         * between images being a CDN concern and images being a compute
         * problem.
         *
         * s-maxage is what Cloudflare honours; max-age is the browser. Chosen
         * deliberately over the usual `immutable` year: these filenames are
         * stable, so a year of immutability would leave a replaced photograph
         * stale for a year with no way to bust it. A day at the CDN with a
         * week of stale-while-revalidate keeps origin traffic near zero while
         * still letting a swapped image propagate on its own.
         */
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      /*
       * There is deliberately no Cache-Control entry for /_next/image
       * here.
       *
       * One was added and removed again: Next.js sets its own header on
       * that route and overrides anything declared here, so the rule
       * looked correct in the config while production still reported
       * cf-cache-status: DYNAMIC. A rule that cannot work is worse than
       * no rule, because it reads as protection that is not there.
       *
       * If optimisation is turned back on, the caching has to be forced
       * from Cloudflare's side with a Cache Rule on /_next/image*.
       */
      {
        /*
         * Fonts are genuinely immutable — the filenames are content-hashed by
         * the build, so a changed font is a changed URL.
         */
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  experimental: {
    /*
     * Enables the forbidden()/unauthorized() functions used by the admin
     * panel's role-based route protection (src/app/admin-panel).
     */
    authInterrupts: true,
  },

  images: {
    /*
     * Set unless OPTIMISE_IMAGES=true. See the note on `optimiseImages`
     * at the top of this file for what has to be in place before that
     * is safe.
     *
     * The original reasoning, which still stands:
     *
     * next/image normally re-encodes and resizes images per request. On this
     * deployment that could not work: the instance has 0.5 CPU and 512 MB, and
     * measured against the live site it began returning 502 at just THREE
     * concurrent /_next/image requests. A browser opens six connections, so
     * scrolling reliably killed the images below the fold — the reported bug.
     *
     * Turning it off is viable specifically because the source files were
     * re-compressed first (40.6 MB to 7.9 MB, average 238 KB, largest 593 KB).
     * They are already AVIF at 2000px, which every current browser supports.
     * Spending an entire CPU-starved instance re-encoding a 240 KB AVIF into a
     * slightly smaller WebP is not a trade worth making; before the
     * re-compression, when sources were 2.8 MB, it would have been.
     *
     * What is given up: per-device srcset, so a phone downloads the 2000px
     * file rather than an 828px one. Roughly 3x more image bytes on mobile,
     * bounded by lazy loading to what is actually scrolled into view. That is
     * a real cost, accepted because the alternative is images that do not
     * appear at all.
     *
     * Both halves of that are still true: the instance is unchanged, and
     * /_next/image is still uncached at the CDN.
     */
    ...(cloudflareImageResizing
      ? { loader: "custom", loaderFile: "./src/lib/cloudflare-image-loader.js" }
      : optimiseImages
        ? {}
        : { unoptimized: true }),

    /*
     * Hosts allowed to serve images, from IMAGE_HOSTS. Next.js 16 requires
     * every external image host to be allowlisted explicitly, and it fails
     * abruptly rather than gracefully — so this must be set before an editor
     * replaces any image in the admin panel with an upload.
     */
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https",
      hostname,
    })),

    /*
     * Only these qualities may be requested. 100 is removed: it produces
     * far larger files for no perceptible gain over 90, and encoding at 100
     * is the slowest path through sharp. 80 and 85 are included because
     * Hero and TrustedPartner request those exact values — Next.js 16
     * rejects a `quality` prop that isn't in this list, at build time,
     * regardless of `unoptimized`.
     */
    qualities: [75, 80, 85, 90],

    /*
     * Prefer AVIF on supporting browsers and use
     * WebP as the next available optimized format.
     */
    /*
     * WebP only, not AVIF.
     *
     * The sources are already AVIF, so re-encoding them to AVIF spends the
     * most expensive encoder in sharp to produce a file barely smaller than
     * the input. AVIF encoding is several times slower than WebP, and on a
     * small instance that difference is the difference between a page that
     * loads and one that times out. WebP is universally supported and the
     * resulting files are small enough.
     */
    formats: ["image/webp"],

    /*
     * Keep optimised variants for a year. The default is short, so on a
     * server whose disk cache is wiped on every deploy the expensive work
     * gets repeated far more often than it needs to be.
     */
    minimumCacheTTL: 31536000,

    /*
     * Widths used when generating responsive full-width candidates.
     *
     * Deliberately trimmed from the ten-entry default. Every breakpoint
     * multiplies the amount of work the server has to do: this page alone
     * referenced 210 distinct optimised variants generated from 18 source
     * images, several of which are 2.6-2.8 MB AVIFs. Each variant means
     * decoding a multi-megabyte AVIF and re-encoding it, which is CPU-bound
     * and slow on a small instance — slow enough to starve the health check
     * on "/" and get the instance restarted, which in turn kills every image
     * request in flight and shows visitors broken images.
     *
     * 2560 and 3840 are removed entirely. They are the most expensive
     * variants by a wide margin, and a property landing page has no need to
     * serve a 3840px-wide photograph: the largest realistic display is a
     * 2x retina laptop, which 1920 already covers. Thinning the mid-range
     * costs nothing visible, because the browser simply picks the next size
     * up and scales down.
     *
     * Net effect is roughly a 60% cut in variants to generate, concentrated
     * on the most expensive ones.
     */
    deviceSizes: [640, 828, 1200, 1920],

    /*
     * Smaller candidates used by images that do not
     * occupy the full viewport width.
     */
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
