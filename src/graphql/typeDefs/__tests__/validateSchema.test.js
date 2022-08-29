/* resolvers use thatconference/api which needs these env variables. */
/* this test is more about successfully building the schema then the
 * resulting schema from the build.
 */
import { buildSubgraphSchema } from '@apollo/subgraph';
import { ApolloServer } from 'apollo-server-express';
import typeDefs from '../../typeDefs';
import directives from '../../directives';

let resolvers;
let originalEnv;

describe('validate schema test', () => {
  beforeAll(() => {
    process.env.POSTMARK_API_TOKEN = 'POSTMARK_API_TOKEN';
    process.env.TITO_CHECKIN_SLUG = 'TITO_CHECKIN_SLUG';
    process.env.SLACK_WEBHOOK_URL = 'SLACK_WEBHOOK_URL';
    process.env.ACTIVE_CAMPAIGN_API = 'ACTIVE_CAMPAIGN_API';
    process.env.ACTIVE_CAMPAIGN_KEY = 'ACTIVE_CAMPAIGN_KEY';
    process.env.SLACK_LEGACY_TOKEN = 'SLACK_LEGACY_TOKEN';

    resolvers = require('../../resolvers');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  let schema = buildSubgraphSchema([{ typeDefs, resolvers }]);

  describe('Validate graphql schema', () => {
    it('schema has successfully build and is and object', () => {
      // TODO: find other ways to validate schema
      expect(typeof schema).toBe('object');
      expect(schema).toBeInstanceOf(Object);
    });
    it('will add auth directive successfully', () => {
      const { authDirectiveTransformer } = directives.auth('auth');
      schema = authDirectiveTransformer(schema);
      // TODO: find other ways to validate schema
      expect(typeof schema).toBe('object');
      expect(schema).toBeInstanceOf(Object);
    });
    it('will add lowerCase directive successfully', () => {
      const { lowerCaseDirectiveTransformer } =
        directives.lowerCase('lowerCase');
      schema = lowerCaseDirectiveTransformer(schema);
      // TODO: find other ways to validate schema
      expect(typeof schema).toBe('object');
      expect(schema).toBeInstanceOf(Object);
    });
    it('will add upperCase directive successfully', () => {
      const { upperCaseDirectiveTransformer } =
        directives.upperCase('upperCase');
      schema = upperCaseDirectiveTransformer(schema);
      // TODO: find other ways to validate schema
      expect(typeof schema).toBe('object');
      expect(schema).toBeInstanceOf(Object);
    });
    it('will run in server correctly', () => {
      const serv = new ApolloServer({ schema });
      expect(typeof serv).toBe('object');
      expect(serv?.graphqlPath).toBe('/graphql');
      expect(serv?.requestOptions?.nodeEnv).toBe('test');
    });
  });
});
