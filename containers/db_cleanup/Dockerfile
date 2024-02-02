# Install dependencies only when needed
FROM registry.access.redhat.com/ubi8/nodejs-16 AS deps
USER 0
WORKDIR /deleted
RUN chmod -R g+rwX /deleted
WORKDIR /app

# Ensure that the user can access all application files
RUN chmod -R g+rwX /app


# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

USER 1001

# EXPOSE 3700

# ENV PORT 3700
