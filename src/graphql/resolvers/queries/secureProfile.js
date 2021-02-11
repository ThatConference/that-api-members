import debug from 'debug';

const dlog = debug('that:api:members:query:privateProfile');

export const fieldResolvers = {
  SecureProfile: {
    // eslint-disable-next-line no-unused-vars
    __resolveType(obj, content, info) {
      dlog('resolve SecureProfile type');
      if (obj.canFeature) return 'PublicProfile';
      return 'PrivateProfile';
    },
  },
};
