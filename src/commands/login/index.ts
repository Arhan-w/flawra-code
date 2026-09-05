import type { Command } from '../../commands.js'
import { hasFlawRAApiKeyAuth } from '../../utils/auth.js'
import { isEnvTruthy } from '../../utils/envUtils.js'

export default () =>
  ({
    type: 'local-jsx',
    name: 'login',
    description: hasFlawRAApiKeyAuth()
      ? 'Switch FlawRA accounts'
      : 'Sign in with your FlawRA account',
    isEnabled: () => !isEnvTruthy(process.env.DISABLE_LOGIN_COMMAND),
    load: () => import('./login.js'),
  }) satisfies Command
