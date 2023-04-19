import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { buildSubgraphSchema } from '@apollo/subgraph';
import debug from 'debug';
import DataLoader from 'dataloader';
import * as Sentry from '@sentry/node';
import { security } from '@thatconference/api';
import { isNil } from 'lodash';

// Graph Types and Resolvers
import typeDefs from './typeDefs';
import resolvers from './resolvers';
import directives from './directives';
import memberStore from '../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:graphServer');
const jwtClient = security.jwt();

const createServerParts = ({ dataSources, httpServer }) => {
  dlog('🚜 creating apollo server and context');
  let schema = {};

  dlog('🚜 building subgraph schema');
  schema = buildSubgraphSchema([{ typeDefs, resolvers }]);

  const directiveTransformers = [
    directives.auth('auth').authDirectiveTransformer,
    directives.lowerCase('lowerCase').lowerCaseDirectiveTransformer,
    directives.upperCase('uppercase').upperCaseDirectiveTransformer,
  ];

  dlog('🚜 adding directiveTransformers: %O', directiveTransformers);
  schema = directiveTransformers.reduce(
    (curSchema, transformer) => transformer(curSchema),
    schema,
  );

  dlog('🚜 creating new apollo server instance');
  const graphQlServer = new ApolloServer({
    schema,
    introspection: JSON.parse(process.env.ENABLE_GRAPH_INTROSPECTION || false),
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: err => {
      dlog('formatError %O', err);

      Sentry.withScope(scope => {
        scope.setTag('formatError', true);
        scope.setLevel('warning');
        scope.setContext('originalError', { originalError: err.originalError });
        scope.setContext('path', { path: err.path });
        scope.setContext('error object', { error: err });
        Sentry.captureException(err);
      });

      return err;
    },
  });

  dlog('🚜 creating createContext function');
  const createContext = async ({ req }) => {
    dlog('🚜 building graphql user context');
    dlog('🚜 assembling datasources');
    const { firestore } = dataSources;

    let context = {
      dataSources: {
        ...dataSources,
        profileLoader: new DataLoader(ids =>
          memberStore(firestore)
            .batchFindMembers(ids)
            .then(members => {
              if (members.includes(null)) {
                Sentry.withScope(scope => {
                  scope.setLevel('error');
                  scope.setContext(
                    `profile loader member(s) don't exist in members collection`,
                    { ids, members },
                  );
                  Sentry.captureMessage(
                    `profile loader member(s) don't exist in members collection`,
                  );
                });
              }
              return ids.map(i => members.find(p => p && p.id === i));
            }),
        ),
      },
    };

    if (!isNil(req.headers.authorization)) {
      dlog('🚜 validating token for %o:', req.headers.authorization);
      Sentry.addBreadcrumb({
        category: 'graphql context',
        message: 'user has authToken',
        level: 'info',
      });

      const validatedToken = await jwtClient.verify(req.headers.authorization);

      Sentry.configureScope(scope => {
        scope.setUser({
          id: validatedToken.sub,
          permissions: validatedToken.permissions.toString(),
        });
      });

      dlog('🚜 validated token: %o', validatedToken);
      context = {
        ...context,
        user: {
          ...validatedToken,
          site: req.userContext.site,
          correlationId: req.userContext.correlationId,
        },
      };
    }

    return context;
  };

  return {
    graphQlServer,
    createContext,
  };
};

// const createServer = ({ dataSources }) => {
//   dlog('creating apollo server');
//   let schema = {};

//   dlog('build subgraph schema');
//   schema = buildSubgraphSchema([{ typeDefs, resolvers }]);

//   const directiveTransformers = [
//     directives.auth('auth').authDirectiveTransformer,
//     directives.lowerCase('lowerCase').lowerCaseDirectiveTransformer,
//     directives.upperCase('uppercase').upperCaseDirectiveTransformer,
//   ];

//   dlog('directiveTransformers: %O', directiveTransformers);
//   schema = directiveTransformers.reduce(
//     (curSchema, transformer) => transformer(curSchema),
//     schema,
//   );

//   return new ApolloServer({
//     schema,
//     introspection: JSON.parse(process.env.ENABLE_GRAPH_INTROSPECTION || false),
//     csrfPrevention: true,
//     cache: 'bounded',
//     dataSources: () => {
//       dlog('creating dataSources');
//       const { firestore } = dataSources;
//       const profileLoader = new DataLoader(ids =>
//         memberStore(firestore)
//           .batchFindMembers(ids)
//           .then(members => {
//             if (members.includes(null)) {
//               Sentry.withScope(scope => {
//                 scope.setLevel('error');
//                 scope.setContext(
//                   `profile loader member(s) don't exist in members collection`,
//                   { ids, members },
//                 );
//                 Sentry.captureMessage(
//                   `profile loader member(s) don't exist in members collection`,
//                 );
//               });
//             }
//             return ids.map(i => members.find(p => p && p.id === i));
//           }),
//       );

//       return {
//         ...dataSources,
//         profileLoader,
//       };
//     },
//     context: async ({ req, res }) => {
//       dlog('building graphql user context');
//       let context = {};

//       if (!isNil(req.headers.authorization)) {
//         dlog('validating token for %o:', req.headers.authorization);
//         Sentry.addBreadcrumb({
//           category: 'graphql context',
//           message: 'user has authToken',
//           level: 'info',
//         });

//         const validatedToken = await jwtClient.verify(
//           req.headers.authorization,
//         );

//         Sentry.configureScope(scope => {
//           scope.setUser({
//             id: validatedToken.sub,
//             permissions: validatedToken.permissions.toString(),
//           });
//         });

//         dlog('validated token: %o', validatedToken);
//         context = {
//           ...context,
//           user: {
//             ...validatedToken,
//             site: req.userContext.site,
//             correlationId: req.userContext.correlationId,
//           },
//         };
//       }

//       return context;
//     },
//     plugins: [],
//     formatError: err => {
//       dlog('formatError %O', err);

//       Sentry.withScope(scope => {
//         scope.setTag('formatError', true);
//         scope.setLevel('warning');
//         scope.setExtra('originalError', err.originalError);
//         scope.setExtra('path', err.path);
//         Sentry.captureException(err);
//       });

//       return err;
//     },
//   });
// };

export default createServerParts;
