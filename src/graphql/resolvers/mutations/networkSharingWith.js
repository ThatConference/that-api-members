import debug from 'debug';
import sharingWithStore from '../../../dataSources/cloudFirestore/sharingWith';

const dlog = debug('that:api:members:network-sharing-with-mutation');

export const fieldResolvers = {
  NetworkSharingWithMutation: {
    update: (
      { sharedWithId },
      { shareWith },
      { dataSources: { firestore }, user },
    ) => {
      dlog('update shared with %s', sharedWithId);

      return sharingWithStore(firestore).update({
        sharedById: user.sub,
        sharedWithId,
        sharingData: {
          notes: shareWith?.notes ?? '',
        },
      });
    },
    appendNewNote: (_, { text }) => {
      dlog('appending text length %d to notes', text?.length);

      throw new Error('Not Implemented');
    },
    remove: ({ sharedWithId }, __, { dataSources: { firestore }, user }) => {
      dlog('removing share with %s', sharedWithId);

      // return sharedWithId;
      return sharingWithStore(firestore)
        .remove({ sharedById: user.sub, sharedWithId })
        .then(result => result.sharedWithId);
    },
  },
};
