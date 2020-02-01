import debug from 'debug';

const dlog = debug('that:api:members:query:Profile');

export const fieldResolvers = {
  Profile: {
    __resolveReference({ id }, { dataSources: { profileLoader } }) {
      dlog('resolveReference');
      return profileLoader.load(id);
    },
  },
};
