import debug from 'debug';

const dlog = debug('that:api:members:network-share-with-me');

export const fieldResolvers = {
  NetworkShareWithMe: {
    sharedWithMeProfile: (
      { sharedProfile: sharedProfileRecord },
      __,
      { dataSources: { profileLoader } },
    ) => profileLoader.load(sharedProfileRecord.parsedId),

    sharedWithMeSharedProfile: async (
      { sharedProfile: sharedProfileRecord },
      __,
      { dataSources: { profileLoader } },
    ) => {
      dlog('resolving sharedWithMeSharedProfile');
      let sharedProfile;
      if (sharedProfileRecord.exists) {
        sharedProfile = sharedProfileRecord;
      } else {
        sharedProfile = await profileLoader.load(sharedProfileRecord.parsedId);
      }

      return {
        ...sharedProfile,
      };
    },
  },
};
