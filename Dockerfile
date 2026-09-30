# ICT Club Management System — production image
#
# Ships the API and the web app in one container: the server serves the plain
# HTML/CSS/JS app from web/ and the API under /api, so a single port (PORT,
# default 4000) is all that needs to be exposed. There is no build step — the
# browser gets the same files that are in the repository.
#
# The club database lives in SQLite at DB_PATH. On first start the container
# creates the administrator account and the club settings (empty, ready for the
# school's own data); afterwards it starts straight away. Mount a volume at
# /app/server/data (or point DB_PATH at a mounted folder) to keep the data
# across restarts and redeploys.
#
#   docker build -t ict-club .
#   docker run -p 4000:4000 -v ict-club-data:/app/server/data ict-club
#
# Node 22 or newer is required: the project uses Node's built-in SQLite.

FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0

WORKDIR /app

# Install dependencies first so the layer is cached between code changes.
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --no-audit --no-fund \
 && npm --prefix server ci --no-audit --no-fund

# The app source (web/ + shared/ + server/) — nothing to compile.
COPY . .

EXPOSE 4000

# Seeding is skipped automatically when the database already has data, so this
# is safe to run on every start: it creates the administrator account and the
# club settings, and never adds sample data.
CMD ["sh", "-c", "npm --prefix server run seed && npm --prefix server start"]
