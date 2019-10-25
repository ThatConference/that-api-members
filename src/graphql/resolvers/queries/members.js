import uuid from 'uuid/v4';

const resolvers = {
  members: async (parent, { message }, { dataSources }) => ({
    id: uuid(),
    message: `resolver got: ${message}`,
  }),
};

export default resolvers;
