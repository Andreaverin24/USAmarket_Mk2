import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import {
  discoverProductLinks,
  hasUsefulProductMarkup,
  normalizeWebUrl,
  type WebCapturePurpose,
  type WebPageSnapshot,
} from '@atlas/catalog';

const MAX_HTML_BYTES = 5_000_000;
const MAX_REDIRECTS = 5;
const HTTP_TIMEOUT_MS = 12_000;
const BROWSER_TIMEOUT_MS = 20_000;

export interface WebCaptureSession {
  capture(url: string, purpose: WebCapturePurpose): Promise<WebPageSnapshot>;
  close(): Promise<void>;
}

export function createWebCaptureSession(siteUrl: string): WebCaptureSession {
  const siteOrigin = new URL(normalizeWebUrl(siteUrl)).origin;
  const cache = new Map<string, Promise<void>>();
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;

  const assertTarget = (url: string, expectedOrigin?: string) => {
    const normalized = normalizeWebUrl(url, expectedOrigin);
    const hostname = new URL(normalized).hostname.toLowerCase();
    let result = cache.get(hostname);
    if (!result) {
      result = assertPublicHostname(hostname);
      cache.set(hostname, result);
    }
    return result.then(() => normalized);
  };

  const ensureBrowser = async () => {
    if (context) return context;
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      acceptDownloads: false,
      javaScriptEnabled: true,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      serviceWorkers: 'block',
      viewport: { width: 1440, height: 1200 },
    });
    await context.routeWebSocket('**/*', (socket) => socket.close());
    await context.route('**/*', async (route) => {
      const request = route.request();
      const requestUrl = request.url();
      if (requestUrl.startsWith('data:') || requestUrl.startsWith('blob:')) {
        await route.continue();
        return;
      }
      try {
        const parsed = new URL(requestUrl);
        if (parsed.protocol !== 'https:')
          throw new Error('Only HTTPS browser requests are allowed');
        await assertTarget(
          parsed.toString(),
          request.resourceType() === 'document' ? siteOrigin : undefined,
        );
        if (['font', 'media'].includes(request.resourceType())) {
          await route.abort('blockedbyclient');
          return;
        }
        await route.continue();
      } catch {
        await route.abort('blockedbyclient');
      }
    });
    return context;
  };

  const render = async (url: string): Promise<WebPageSnapshot> => {
    const allowedUrl = await assertTarget(url, siteOrigin);
    const currentContext = await ensureBrowser();
    const page = await currentContext.newPage();
    try {
      const response = await page.goto(allowedUrl, {
        waitUntil: 'domcontentloaded',
        timeout: BROWSER_TIMEOUT_MS,
      });
      if (!response || !response.ok())
        throw new Error(`Browser navigation failed: ${response?.status() ?? 'no response'}`);
      await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(250);
      const finalUrl = await assertTarget(page.url(), siteOrigin);
      const html = await page.content();
      if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES)
        throw new Error('Rendered page exceeds 5 MB');
      return { requestedUrl: allowedUrl, finalUrl, html, method: 'browser' };
    } finally {
      await page.close();
    }
  };

  return {
    async capture(url, purpose) {
      const allowedUrl = await assertTarget(url, siteOrigin);
      let staticSnapshot: WebPageSnapshot | undefined;
      let staticError: unknown;
      try {
        staticSnapshot = await fetchPublicHtml(allowedUrl, siteOrigin, assertTarget);
      } catch (error) {
        staticError = error;
      }
      if (staticSnapshot) {
        const useful =
          purpose === 'category'
            ? discoverProductLinks(staticSnapshot.html, staticSnapshot.finalUrl, siteOrigin)
                .length > 0
            : hasUsefulProductMarkup(staticSnapshot.html, staticSnapshot.finalUrl);
        if (useful) return staticSnapshot;
      }
      try {
        return await render(allowedUrl);
      } catch (browserError) {
        const first = staticError instanceof Error ? staticError.message : undefined;
        const second =
          browserError instanceof Error ? browserError.message : 'browser capture failed';
        throw new Error(
          first ? `HTTP capture failed: ${first}; Chromium failed: ${second}` : second,
        );
      }
    },
    async close() {
      await context?.close();
      await browser?.close();
      context = undefined;
      browser = undefined;
    },
  };
}

async function fetchPublicHtml(
  input: string,
  siteOrigin: string,
  assertTarget: (url: string, expectedOrigin?: string) => Promise<string>,
): Promise<WebPageSnapshot> {
  const requestedUrl = await assertTarget(input, siteOrigin);
  let currentUrl = requestedUrl;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    currentUrl = await assertTarget(currentUrl, siteOrigin);
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      headers: {
        accept: 'text/html,application/xhtml+xml;q=0.9',
        'accept-language': 'en-US,en;q=0.8',
        'user-agent': 'AtlasCatalogImporter/0.1',
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect response has no Location header');
      if (redirect === MAX_REDIRECTS) throw new Error('Page exceeds redirect limit');
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    if (!response.ok || !response.body) throw new Error(`Page download failed: ${response.status}`);
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml'))
      throw new Error('Page did not return HTML');
    const html = await readLimitedText(response, MAX_HTML_BYTES);
    return {
      requestedUrl,
      finalUrl: await assertTarget(currentUrl, siteOrigin),
      html,
      method: 'http',
    };
  }
  throw new Error('Page exceeds redirect limit');
}

async function readLimitedText(response: Response, byteLimit: number) {
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > byteLimit) {
      await reader.cancel();
      throw new Error('Page exceeds 5 MB');
    }
    chunks.push(result.value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function assertPublicHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  if (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.home.arpa')
  )
    throw new Error('Web import host is not public');
  if (isIP(normalized)) throw new Error('Literal IP addresses are forbidden');
  const addresses = await lookup(normalized, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('Web import host did not resolve');
  for (const { address } of addresses)
    if (isPrivateOrReservedAddress(address))
      throw new Error('Web import host resolves to a private or reserved address');
}

export function isPrivateOrReservedAddress(address: string) {
  const normalized = address.toLowerCase().split('%')[0]!;
  if (normalized.startsWith('::ffff:'))
    return isPrivateOrReservedAddress(normalized.slice('::ffff:'.length));
  if (isIP(normalized) === 4) {
    const [a, b, c] = normalized.split('.').map(Number) as [number, number, number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (isIP(normalized) === 6)
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      /^fe[89ab]/.test(normalized) ||
      /^fe[c-f]/.test(normalized) ||
      normalized.startsWith('ff') ||
      normalized.startsWith('2001:db8:')
    );
  return true;
}
