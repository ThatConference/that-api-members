import debug from 'debug';

import sharingWithStore from '../../../dataSources/cloudFirestore/sharingWith';
import sharedProfileStore from '../../../dataSources/cloudFirestore/sharedProfile';

const dlog = debug('that:api:members:membersNetworkQuery');

export const fieldResolvers = {
  MembersNetworkQuery: {
    sharedByMe: async (_, __, { dataSources: { firestore }, user }) => {
      dlog('shared by me');
      const sharingWith = await sharingWithStore(firestore).findSharedById(
        user.sub,
      );

      return sharingWith.map(n => ({
        ...n,
      }));
    },

    sharedWithMe: async (_, __, { dataSources: { firestore }, user }) => {
      dlog('shared with me');
      const sharingWithMe = await sharingWithStore(firestore).findSharedWithId(
        user.sub,
      );
      const memberIds = sharingWithMe.map(d => d.sharedById);
      // We have ids of who is sharing data with me
      const sharedProfiles = await sharedProfileStore(firestore).batchGet(
        memberIds,
      );

      return sharingWithMe.map(swm => {
        const sharedProfile =
          sharedProfiles.find(p => p.parsedId === swm.sharedById) ?? {};
        const out = {
          ...swm,
          sharedProfile,
        };
        // Not exposed, just to be safe
        delete out.notes;

        return out;
      });
    },
  },
};
