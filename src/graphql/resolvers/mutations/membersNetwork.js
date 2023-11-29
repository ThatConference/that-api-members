import debug from 'debug';

const dlog = debug('that:api:members:mutation:members-network');

export const fieldResolvers = {
  MembersNetworkMutation: {
    add: () => ({}),

    sharingWith: (_, { sharedWithId }) => {
      dlog('enter sharingWith path for %s', sharedWithId);

      return { sharedWithId };
    },
  },
};
