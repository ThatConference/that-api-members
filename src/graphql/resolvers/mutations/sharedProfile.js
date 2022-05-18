import debug from 'debug';
import sharedProfileStore from '../../../dataSources/cloudFirestore/sharedProfile';
import memberStore from '../../../dataSources/cloudFirestore/member';
import constants from '../../../constants';

const dlog = debug('that:api:members:mutation:SharedProfile');

export const fieldResolvers = {
  SharedProfileMutation: {
    create: (
      { memberId },
      { profile },
      {
        dataSources: {
          firestore,
          events: { graphCdnEvents },
        },
      },
    ) => {
      dlog('create shared profile called');
      return sharedProfileStore(firestore)
        .create({ memberId, profile })
        .then(createdProfile => {
          graphCdnEvents.emit(
            constants.GRAPHCDN.EVENT_NAME.PURGE,
            constants.GRAPHCDN.PURGE.MEMBER,
            memberId,
          );
          return createdProfile;
        });
    },
    update: (
      { memberId },
      { profile },
      {
        dataSources: {
          firestore,
          events: { graphCdnEvents },
        },
      },
    ) => {
      dlog('update shared profile called');
      return sharedProfileStore(firestore)
        .update({ memberId, profile })
        .then(updatedProfile => {
          graphCdnEvents.emit(
            constants.GRAPHCDN.EVENT_NAME.PURGE,
            constants.GRAPHCDN.PURGE.MEMBER,
            memberId,
          );
          return updatedProfile;
        });
    },
    delete: ({ memberId }, __, { dataSources: { firestore } }) => {
      dlog('delete shared profile called');
      return sharedProfileStore(firestore)
        .remove({ memberId })
        .then(id => memberStore(firestore).findMe(id));
    },
  },
};
