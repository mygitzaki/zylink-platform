// Feature flags for controlling V2 access
export const FEATURE_FLAGS = {
  CREATOR_V2_ENABLED: import.meta.env.VITE_CREATOR_V2_ENABLED === 'true',
  CREATOR_V2_BETA_USERS: [
    'sohailkhan8i9900@gmail.com',
    'test@example.com',
    'admin@zylike.com'
  ],
  CREATOR_V2_ROLES: ['ADMIN', 'SUPER_ADMIN']
};

export const hasFeatureAccess = (user, feature) => {
  if (!user) return false;

  switch (feature) {
    case 'CREATOR_V2':
      // Check if feature is globally enabled
      if (!FEATURE_FLAGS.CREATOR_V2_ENABLED) return false;
      
      // Check if user is in beta users list
      if (FEATURE_FLAGS.CREATOR_V2_BETA_USERS.includes(user.email)) return true;
      
      // Check if user has required role
      if (FEATURE_FLAGS.CREATOR_V2_ROLES.includes(user.role)) return true;
      
      // Check if user email contains 'test' (for testing)
      if (user.email?.includes('test')) return true;
      
      return false;
    
    default:
      return false;
  }
};

export const getFeatureConfig = (feature) => {
  switch (feature) {
    case 'CREATOR_V2':
      return {
        enabled: FEATURE_FLAGS.CREATOR_V2_ENABLED,
        betaUsers: FEATURE_FLAGS.CREATOR_V2_BETA_USERS,
        allowedRoles: FEATURE_FLAGS.CREATOR_V2_ROLES
      };
    default:
      return null;
  }
};
