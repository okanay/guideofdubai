import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'
import fs from 'fs'
import crypto from 'crypto'
import { exec } from 'child_process'

const app = new Hono()

app.use(
  '/*',
  serveStatic({
    root: './dist/',
    getContent: path => {
      try {
        if (path.endsWith('.js') && !fs.existsSync(path)) {
          const tsPath = path.replace('.js', '.ts')
          if (fs.existsSync(tsPath)) {
            const file = fs.readFileSync(tsPath)
            return file
          }
        }

        const file = fs.readFileSync(path)
        if (!file) return null
        return file as any
      } catch (error) {
        if (path === 'dist/main/index.html' || path === 'dist/') {
          return null
        }
        return null
      }
    },
    onFound: (path, c) => {
      if (
        path.endsWith('.js') ||
        path.endsWith('.ts') ||
        path.endsWith('.css')
      ) {
        c.header(
          'Cache-Control',
          'no-store, no-cache, must-revalidate, max-age=0',
        )
      }
    },
  }),
)

app.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store, no-cache')
  await next()
})

app.get('/', c => {
  const html = Bun.file('./dist/main/index.html')
  return c.html(html.text())
})

app.get('/product', c => {
  const html = Bun.file('./dist/product/index.html')
  return c.html(html.text())
})

app.get('/login', c => {
  const html = Bun.file('./dist/login/index.html')
  return c.html(html.text())
})

app.get('/register', c => {
  const html = Bun.file('./dist/register/index.html')
  return c.html(html.text())
})

app.get('/profile', c => {
  const html = Bun.file('./dist/profile/index.html')
  return c.html(html.text())
})

app.get('/terms', c => {
  const html = Bun.file('./dist/terms/index.html')
  return c.html(html.text())
})

app.get('/about', c => {
  const html = Bun.file('./dist/about/index.html')
  return c.html(html.text())
})

app.get('/about', c => {
  const html = Bun.file('./dist/about-mobile/index.html')
  return c.html(html.text())
})

app.get('/contact', c => {
  const html = Bun.file('./dist/contact/index.html')
  return c.html(html.text())
})

app.get('/faq', c => {
  const html = Bun.file('./dist/faq/index.html')
  return c.html(html.text())
})

app.get('/faq', c => {
  const html = Bun.file('./dist/faq-mobile/index.html')
  return c.html(html.text())
})

app.get('/activities', c => {
  const html = Bun.file('./dist/activities/index.html')
  return c.html(html.text())
})

app.get('/visa', c => {
  const html = Bun.file('./dist/visa/index.html')
  return c.html(html.text())
})

app.get('/otel', c => {
  const html = Bun.file('./dist/otel/index.html')
  return c.html(html.text())
})

app.get('/otel-details', c => {
  const html = Bun.file('./dist/otel-details/index.html')
  return c.html(html.text())
})

app.get('/rent-a-car', c => {
  const html = Bun.file('./dist/rent-a-car/index.html')
  return c.html(html.text())
})

app.get('/rent-a-car-payment', c => {
  const html = Bun.file('./dist/rent-a-car-payment/index.html')
  return c.html(html.text())
})

app.get('/payment', c => {
  const html = Bun.file('./dist/payment/index.html')
  return c.html(html.text())
})

app.get('/purchase-status', c => {
  const html = Bun.file('./dist/purchase-status/index.html')
  return c.html(html.text())
})

app.get('/visa-ship', c => {
  const html = Bun.file('./dist/visa-ship/index.html')
  return c.html(html.text())
})

const secret = 'LHOUwjBFGyori7tltMnRQ2YtanvObPZOenCowk/Cq8c='

app.post('/github-push-event', async c => {
  const githubEvent = c.req.header('X-GitHub-Event')
  const signature = c.req.header('X-Hub-Signature-256')

  if (githubEvent !== 'push' || !signature) {
    return c.json({ error: 'Invalid event or missing signature' }, 400)
  }

  const payload = await c.req.text()
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = `sha256=${hmac.digest('hex')}`

  if (signature !== expectedSignature) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  c.status(200)
  setImmediate(() => {
    runBuildProcess()
  })
  return c.body(null)
})

function runBuildProcess(): void {
  exec(
    'git pull && bun run build && sudo systemctl restart guideofdubai.service',
    { cwd: '/root/guideofdubai' },
    (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Exec error: ${error}`)
        console.error(`stderr: ${stderr}`)
        return
      }
      console.log(`Command output: ${stdout}`)
    },
  )
}

const port = 3081
console.log(`Server is running on port ${port}`)

export default { fetch: app.fetch, port }
