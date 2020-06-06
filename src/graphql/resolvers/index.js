import { resolvers as graphScalars } from 'graphql-scalars';
import { graph } from '@thatconference/api';

import queries, { fieldResolvers as qFieldResolvers } from './queries';
import mutations, { fieldResolvers as mFieldResolvers } from './mutations';

const createResolvers = {
  ...graphScalars,
  ...graph.scalars.slug,
  ...graph.scalars.date,

  ...qFieldResolvers,
  ...mFieldResolvers,

  Query: {
    ...queries,
  },

  Mutation: {
    ...mutations,
  },
};

export default createResolvers;
