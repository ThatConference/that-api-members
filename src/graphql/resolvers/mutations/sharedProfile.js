import debug from 'debug';
import sharedProfileStore from '../../../dataSources/cloudFirestore/sharedProfile';
import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:mutation:SharedProfile');

export const fieldResolvers = {
  SharedProfileMutation: {
    create: ({ memberId }, { profile }, { dataSources: { firestore } }) => {
      dlog('create shared profile called');
      return sharedProfileStore(firestore).create({ memberId, profile });
    },
    update: ({ memberId }, { profile }, { dataSources: { firestore } }) => {
      dlog('update shared profile called');
      return sharedProfileStore(firestore).update({ memberId, profile });
    },
    delete: ({ memberId }, __, { dataSources: { firestore } }) => {
      dlog('delete shared profile called');
      return sharedProfileStore(firestore)
        .remove({ memberId })
        .then(id => memberStore(firestore).findMe(id));
    },
  },
};
