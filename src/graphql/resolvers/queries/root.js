import debug from 'debug';

const dlog = debug('that:api:members:query');

const resolvers = {
  members: () => {
    dlog('members');
    return {};
  },
};

export default resolvers;
