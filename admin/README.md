This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

### Customer orders

After signing in to the dashboard, open **Orders** in the sidebar to review customer receipts. The admin app forwards the dashboard session to the read-only `GET /api/admin/orders/?page=1` endpoint. Django returns `orders`, `page`, and `pages`. Each order includes a customer email (or username), its checkout receipt, and the saved line items.

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Dashboard login

From the server directory, run `python manage.py configure_dashboard_admin` in the Django virtual environment. Enter your chosen username and password at the prompts, then restart Django. The command saves the username and Django password hash in the ignored server/.env file. Repeat the command and restart all Django workers to rotate the credentials and revoke existing dashboard sessions. If your deployment supplies these settings as environment variables, update them there because they take precedence over the file.

Open /login on the admin app. Dashboard sessions last eight hours. The admin app uses DJANGO_API_BASE_URL to reach Django. For HTTPS deployments set DJANGO_DEBUG=False, ALLOWED_HOSTS to the Django hostname(s), and CSRF_TRUSTED_ORIGINS to the exact public admin origin. Secure dashboard cookies are enabled when debug mode is off.

Run the dashboard browser journey from the client directory with `npx playwright test --config dashboard.playwright.config.ts`. It starts an isolated Django database and admin frontend. Set PLAYWRIGHT_CHANNEL=chrome to use installed Chrome.
