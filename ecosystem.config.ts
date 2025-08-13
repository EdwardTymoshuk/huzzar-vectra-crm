// ecosystem.config.js
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
        NEXTAUTH_URL: 'http://185.242.135.184:3000',
        AUTH_TRUST_HOST: 'true',
      },
    },
  ],
}
