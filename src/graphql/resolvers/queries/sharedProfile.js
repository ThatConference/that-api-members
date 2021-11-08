import debug from 'debug';
import sharedProfileStore from '../../../dataSources/cloudFirestore/sharedProfile';

const dlog = debug('that:api:members:query:SharedProfile');

export const fieldResolvers = {
  SharedProfile: {
    async __resolveReference(
      { id },
      { dataSources: { firestore, profileLoader } },
    ) {
      dlog('resolveReference SharedProfile');

      // return profileLoader.load(id);
      return sharedProfileStore(firestore)
        .get(id)
        .then(sharedProfile => {
          if (sharedProfile) {
            return {
              ...sharedProfile,
              id,
            };
          }

          return profileLoader.load(id);
        });
    },
    city: ({ city }) => city ?? null,
    company: ({ company }) => company ?? null,
    country: ({ country }) => country ?? null,
    phone: ({ phone }) => phone ?? null,
    state: ({ state }) => state ?? null,
  },
};
