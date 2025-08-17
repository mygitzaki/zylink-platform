const { getPrisma: getPrismaFromConfig, closePrisma: closePrismaFromConfig, checkDatabaseHealth } = require('../config/database');

// Re-export the functions from the new configuration
const getPrisma = () => {
  return getPrismaFromConfig();
};

const closePrisma = async () => {
  return await closePrismaFromConfig();
};

// Add health check function
const checkHealth = async () => {
  return await checkDatabaseHealth();
};

module.exports = { getPrisma, closePrisma, checkHealth };







