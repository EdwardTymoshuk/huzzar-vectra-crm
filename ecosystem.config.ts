// ecosystem.config.ts
module.exports = {
  apps: [
    {
      name: 'vectra-crm',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
        NEXTAUTH_URL: 'http://57.128.227.195/',
        AUTH_TRUST_HOST: 'true',
        DATABASE_URL:
          'postgresql://huzzar_admin:Huzz%40r2025%21@57.128.227.195/huzzar_vectra_crm',
      },
    },
    {
      name: 'vectra-crm-staging',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'staging',
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        NEXTAUTH_URL: 'http://57.128.227.195:3001',
        AUTH_TRUST_HOST: 'true',
        DATABASE_URL:
          'postgresql://huzzar_admin:Huzz%40r2025%21@127.0.0.1/huzzar_vectra_crm_staging',
      },
    },
  ],
}
