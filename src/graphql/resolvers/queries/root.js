import debug from 'debug';

const dlog = debug('that-api-members:query');

const resolvers = {
  members: () => {
    dlog('root:members query called');
    return {};
  },
};

export default resolvers;
