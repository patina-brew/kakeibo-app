// server と client を同時起動する(npm のバッチ経由を避け、Ctrl+C で即停止できるようにする)
import { concurrently } from 'concurrently'

const { result } = concurrently(
  [
    {
      name: 'server',
      command: 'node server/node_modules/tsx/dist/cli.mjs watch server/src/index.ts',
      prefixColor: 'blue',
    },
    {
      name: 'client',
      command: 'node client/node_modules/vite/bin/vite.js client',
      prefixColor: 'green',
    },
  ],
  {
    killOthersOn: ['failure', 'success'],
  },
)

result.catch(() => {
  process.exitCode = 1
})
