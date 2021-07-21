import debug from 'debug';
import sharedProfileStore from '../../../dataSources/cloudFirestore/sharedProfile';

const dlog = debug('that:api:members:query:shared');

export const fieldResolvers = {
  ProfilesQuery: {
    shared: (
      { memberId },
      __,
      { dataSources: { firestore, profileLoader } },
    ) => {
      dlog('shared profile for %s', memberId);
      return sharedProfileStore(firestore)
        .get(memberId)
        .then(sharedProfile => {
          if (sharedProfile) {
            return {
              ...sharedProfile,
              id: memberId,
            };
          }

          return profileLoader.load(memberId);
        });
    },
  },
};
