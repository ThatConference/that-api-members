import debug from 'debug';

const dlog = debug('that:api:members:query:privateProfile');

export const fieldResolvers = {
  PrivateProfile: {
    __resolveReference({ id }, { dataSources: { profileLoader } }) {
      dlog('resolveReference %s', id);
      return profileLoader.load(id);
    },
    lastInitial: ({ lastName }) => (lastName ? lastName.substring(0, 1) : '_'),
  },
};
