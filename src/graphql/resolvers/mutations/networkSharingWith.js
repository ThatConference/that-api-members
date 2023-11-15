import debug from 'debug';

const dlog = debug('that:api:members:network-sharing-with-mutation');

export const fieldResolvers = {
  NetworkSharingWithMutation: {
    update: () => ({}),
    appendNewNote: (_, { text }) => {
      dlog('appending text length %d to notes', text?.length);

      return {};
    },
    remove: (_, { sharedWithId }) => {
      dlog('removing share with %s', sharedWithId);

      return sharedWithId;
    },
  },
};
