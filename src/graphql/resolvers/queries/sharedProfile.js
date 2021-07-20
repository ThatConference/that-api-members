import debug from 'debug';

const dlog = debug('that:api:members:query:SharedProfile');

export const fieldResolvers = {
  SharedProfile: {
    async __resolveReference({ id }, { dataSources: { profileLoader } }) {
      dlog('resolveReference SharedProfile');

      return profileLoader.load(id);
    },
  },
};
