import * as React from 'react';
import { Text } from '../ink.js';
import { isFlawraAISubscriber } from '../utils/auth.js';
import { isChromeExtensionInstalled, shouldEnableFlawraInChrome } from '../utils/flawraInChrome/setup.js';
import { isRunningOnHomespace } from '../utils/envUtils.js';
import { useStartupNotification } from './notifs/useStartupNotification.js';
function getChromeFlag(): boolean | undefined {
  if (process.argv.includes('--chrome')) {
    return true;
  }
  if (process.argv.includes('--no-chrome')) {
    return false;
  }
  return undefined;
}
export function useChromeExtensionNotification() {
  useStartupNotification(_temp);
}
async function _temp() {
  const chromeFlag = getChromeFlag();
  if (!shouldEnableFlawraInChrome(chromeFlag)) {
    return null;
  }
  if (true && !isFlawraAISubscriber()) {
    return {
      key: "chrome-requires-subscription",
      jsx: <Text color="error">Flawra in Chrome requires a flawra.ai subscription</Text>,
      priority: "immediate",
      timeoutMs: 5000
    };
  }
  const installed = await isChromeExtensionInstalled();
  if (!installed && !isRunningOnHomespace()) {
    return {
      key: "chrome-extension-not-detected",
      jsx: <Text color="warning">Chrome extension not detected · https://flawra.ai/chrome to install</Text>,
      priority: "immediate",
      timeoutMs: 3000
    };
  }
  if (chromeFlag === undefined) {
    return {
      key: "flawra-in-chrome-default-enabled",
      text: "Flawra in Chrome enabled \xB7 /chrome",
      priority: "low"
    };
  }
  return null;
}
