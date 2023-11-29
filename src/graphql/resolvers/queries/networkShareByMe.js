import debug from 'debug';

const dlog = debug('that:api:members:query:netork-share-by-me');

export const fieldResolvers = {
  NetworkShareByMe: {
    sharingWithProfile: async (
      { id: sharedWithId },
      __,
      { dataSources: { profileLoader } },
    ) => {
      dlog('resolving sharingWithProfile');
      const profile = await profileLoader.load(sharedWithId);
      let result = null;
      if (profile?.id && profile?.firstName) {
        result = profile;
      }
      return result;
    },
  },
};
