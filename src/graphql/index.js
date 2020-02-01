import _ from 'lodash';
import { ApolloServer, gql, mergeSchemas } from 'apollo-server-cloud-functions';
import { buildFederatedSchema } from '@apollo/federation';
import debug from 'debug';
import DataLoader from 'dataloader';

import { security } from '@thatconference/api';

// Graph Types and Resolvers
import typeDefsRaw from './typeDefs';
import resolvers from './resolvers';
import directives from './directives';
import memberStore from '../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:graphServer');
const jwtClient = security.jwt();

// convert our raw schema to gql
const typeDefs = gql`
  ${typeDefsRaw}
`;

const createServer = ({ dataSources }) => {
  dlog('creating graph server');

  const federatedSchemas = buildFederatedSchema([{ typeDefs, resolvers }]);
  const schema = mergeSchemas({
    schemas: [federatedSchemas],
    schemaDirectives: {
      ...directives,
    },
  });

  return new ApolloServer({
    schema,
    introspection: JSON.parse(process.env.ENABLE_GRAPH_INTROSPECTION || false),
    playground: JSON.parse(process.env.ENABLE_GRAPH_PLAYGROUND)
      ? { endpoint: '/' }
      : false,

    dataSources: () => {
      dlog('creating dataSources');
      const { firestore } = dataSources;
      const profileLoader = new DataLoader(ids =>
        memberStore(firestore).batchFindMembers(ids),
      );

      return {
        ...dataSources,
        profileLoader,
      };
    },

    context: async ({ req, res }) => {
      dlog('buulding graphql user context');
      let context = {};

      if (!_.isNil(req.headers.authorization)) {
        dlog('validating token for %o:', req.headers.authorization);

        const validatedToken = await jwtClient.verify(
          req.headers.authorization,
        );

        dlog('validated token: %o', validatedToken);
        context = {
          ...context,
          user: validatedToken,
        };
      }

      return context;
    },

    formatError: err => {
      dataSources.sentry.captureException(err);
      return err;
    },
  });
};

export default createServer;
