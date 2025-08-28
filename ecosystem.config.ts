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
        NEXTAUTH_URL: 'http://http://57.128.227.195/',
        AUTH_TRUST_HOST: 'true',
        DATABASE_URL:
          'postgresql://huzzar_admin:Huzz%40r2025%21@57.128.227.195/huzzar_vectra_crm',
      },
    },
  ],
}
