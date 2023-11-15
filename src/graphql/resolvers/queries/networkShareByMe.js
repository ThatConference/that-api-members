import debug from 'debug';

const dlog = debug('that:api:members:query:shared-by-me');

export const fieldResolvers = {
  NetworkShareByMe: {
    sharingWithProfile: async (
      { id: sharedWithId },
      __,
      { dataSources: { profileLoader } },
    ) => {
      const profile = await profileLoader.load(sharedWithId);
      let result = null;
      if (profile?.id && profile?.firstName) {
        result = profile;
      }
      return result;
    },
  },
};
