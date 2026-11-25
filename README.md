# M-3 Ecommerce

M-3 Ecommerce has a Django API (`server`), a Next.js storefront (`client`), and a Next.js admin dashboard (`admin`).

For local setup, install Python, Node.js with npm, and PostgreSQL 18. Start PostgreSQL and make sure its `bin` folder is on your PATH. Run the following commands in PowerShell.

## 1. Restore the PostgreSQL backup

From the project root, create the database user `m3_app` and an empty database named `m3_project`. Choose a password for `m3_app` when prompted. If asked for the `postgres` password, use your local PostgreSQL administrator password.

```powershell
createuser -h localhost -U postgres -P m3_app
createdb -h localhost -U postgres -O m3_app m3_project
pg_restore -h localhost -U m3_app -d m3_project --no-owner --no-privileges --single-transaction backups/m3-ecommerce.backup
```

## 2. Configure Django and create the dashboard admin

From the project root, enter the server folder and create the local settings file if needed.

```powershell
cd server
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

In `server/.env`, set these values. Replace the password placeholder with the password you chose for `m3_app`.

```dotenv
DB_NAME=m3_project
DB_USER=m3_app
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
```

From `server`, install the dependencies, apply migrations, and set up the dashboard login.

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py configure_dashboard_admin
```

Enter the username and password you want to use on the dashboard, then confirm the password. To change the login later, rerun `configure_dashboard_admin` and restart Django.

## 3. Run the project

**API** — In the same `server` terminal, start Django on port 8000.

```powershell
.\.venv\Scripts\python manage.py runserver
```

**Storefront** — Open a second terminal at the project root.

```powershell
cd client
npm ci
npm run dev -- --port 3000
```

**Admin dashboard** — Open a third terminal at the project root.

```powershell
cd admin
npm ci
npm run dev -- --port 3001
```

Check the restored catalog in the [storefront](http://localhost:3000). Sign in with your dashboard username and password at the [admin login](http://localhost:3001/login).
