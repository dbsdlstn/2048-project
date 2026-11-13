/// <reference types="node" />
/**
 * Which Chromium the Playwright tools use. In a sandbox with a pre-installed
 * browser (`/opt/pw-browsers/chromium`, or `PW_CHROMIUM_PATH`), that one;
 * otherwise (CI) the browser `npx playwright install chromium` downloaded.
 */
import { existsSync } from 'node:fs';

const PREINSTALLED = '/opt/pw-browsers/chromium';

/** Launch options naming the browser binary, or `{}` for Playwright's own download. */
export function chromiumOptions(): { executablePath?: string } {
  const path = process.env.PW_CHROMIUM_PATH ?? (existsSync(PREINSTALLED) ? PREINSTALLED : null);
  return path ? { executablePath: path } : {};
}
