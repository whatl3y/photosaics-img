var self = module.exports = {
  app: {
    name: process.env.APP_NAME || "sosaicsimg"
  },

  server: {
    PORT: process.env.PORT || 8000,
    CLUSTERING: process.env.CLUSTERING || false,
    CLUSTER_MAX_CPUS: process.env.CLUSTER_MAX_CPUS || 5,
    IS_PRODUCTION: process.env.IS_PRODUCTION || false,
    HOST: process.env.HOSTNAME || "http://localhost:8080"
  },

  newrelic: {
    key: process.env.NEWRELIC_KEY,
    level: process.env.NEWRELIC_LEVEL || 'info'
  },

  redis: {
    url: process.env.REDIS_URL
  },

  aws: {
    s3: {
      bucket: 'sosaics'//'sosaicsimg'
    }
  },

  cryptography: {
    algorithm: "aes-256-ctr",
    password: process.env.CRYPT_SECRET
  },

  logger: {
    options: {
      name: process.env.APP_NAME || "sosaicsimg",
      level: process.env.LOGGING_LEVEL || "info",
      stream: process.stdout
      /*streams: [
        {
          level: process.env.LOGGING_LEVEL || "info",
          path: path.join(__dirname,"..","logs","wiki.log")
        }
      ]*/
    }
  }
};
