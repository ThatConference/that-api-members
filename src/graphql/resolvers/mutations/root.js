import debug from 'debug';

const dlog = debug('that-api-members:mutation');

const resolvers = {
  members: () => {
    dlog('root:members mutation called');
    return {};
  },
};

export default resolvers;
