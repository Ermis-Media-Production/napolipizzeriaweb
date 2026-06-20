FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install all dependencies (including dev for build)
RUN pnpm install --no-frozen-lockfile

# Fix lucide-react symlink issue: copy the correct version directly
RUN cp -r node_modules/.pnpm/lucide-react@0.542.0_react@19.2.1/node_modules/lucide-react node_modules/lucide-react 2>/dev/null || \
    cp -r node_modules/.pnpm/lucide-react@0.453.0_react@19.2.1/node_modules/lucide-react node_modules/lucide-react 2>/dev/null || true

# Copy source
COPY . .

# Build-time VITE_ env vars (must be ARGs so Vite can bake them into the bundle)
ARG VITE_OAUTH_PORTAL_URL=https://manus.im
ARG VITE_APP_ID=brxvWsWYfwFxoqeFg9Rbqu
ARG VITE_APP_TITLE=Napoli Pizzeria LV
ARG VITE_APP_LOGO=https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663690084073/jtMmVctTZtvXwZEV.png
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_AUTHNET_CLIENT_KEY
ARG VITE_FRONTEND_FORGE_API_KEY
ARG VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID

# Export ARGs as ENV so Vite picks them up during build
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_AUTHNET_CLIENT_KEY=$VITE_AUTHNET_CLIENT_KEY
ENV VITE_FRONTEND_FORGE_API_KEY=$VITE_FRONTEND_FORGE_API_KEY
ENV VITE_FRONTEND_FORGE_API_URL=$VITE_FRONTEND_FORGE_API_URL
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID

# Build frontend and server
RUN pnpm build

# ── Production stage ──────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL deps (vite needed at runtime for server/_core/vite.ts in production mode)
RUN pnpm install --no-frozen-lockfile

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy server source (needed for tsx/node resolution)
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
