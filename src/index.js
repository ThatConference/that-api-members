/* eslint-disable import/prefer-default-export */
import 'dotenv/config';
import connect from 'connect';
import cors from 'cors';
import debug from 'debug';
import { Firestore } from '@google-cloud/firestore';
import pino from 'pino';
import { Client as Postmark } from 'postmark';
import responseTime from 'response-time';
import * as Sentry from '@sentry/node';
import uuid from 'uuid/v4';

import apolloGraphServer from './graphql';
import envConfig from './envConfig';
import { version } from '../package.json';
import userEventEmitter from './events/user';

const dlog = debug('that:api:members:index');
const defaultVersion = `that-api-gateway@${version}`;
const firestore = new Firestore();
const api = connect();

const postmark = new Postmark(envConfig.postmarkApiToken);
const userEvents = userEventEmitter(postmark);

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  prettyPrint: JSON.parse(process.env.LOG_PRETTY_PRINT || false)
    ? { colorize: true }
    : false,
  mixin() {
    return {
      service: 'that-api-members',
    };
  },
});

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.THAT_ENVIRONMENT,
  release: process.env.SENTRY_VERSION || defaultVersion,
  debug: process.env.NODE_ENV === 'development',
});

Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'that-api-members');
});

const createConfig = () => ({
  dataSources: {
    sentry: Sentry,
    logger,
    firestore,
    postmark,
    events: {
      userEvents,
    },
  },
});

const graphServer = apolloGraphServer(createConfig());

const useSentry = async (req, res, next) => {
  Sentry.addBreadcrumb({
    category: 'that-api-members',
    message: 'init',
    level: Sentry.Severity.Info,
  });
  next();
};

/**
 * http middleware function
 * here we are intercepting the http call and building our own notion of a users context.
 * we then add it to the request so it can later be used by the gateway.
 * If you had something like a token that needs to be passed through to the gateways children this is how you intercept it and setup for later.
 *
 * @param {string} req - http request
 * @param {string} res - http response
 * @param {string} next - next function to execute
 *
 */
const createUserContext = (req, res, next) => {
  dlog('creating user context');

  const correlationId = req.headers['that-correlation-id']
    ? req.headers['that-correlation-id']
    : uuid();

  const contextLogger = logger.child({ correlationId });

  req.userContext = {
    locale: req.headers.locale,
    authToken: req.headers.authorization,
    correlationId: req.headers['correlation-id']
      ? req.headers['correlation-id']
      : uuid(),
    sentry: Sentry,
    logger: contextLogger,
  };

  next();
};

const apiHandler = async (req, res) => {
  dlog('api handler called');

  const graphApi = graphServer.createHandler();

  graphApi(req, res);
};

function failure(err, req, res, next) {
  logger.error(err);
  logger.trace('Middleware Catch All');

  Sentry.captureException(err);

  res
    .set('Content-Type', 'application/json')
    .status(500)
    .json(err);
}

/**
 * http middleware function that follows adhering to express's middleware.
 * Last item in the middleware chain.
 * This is your api handler for your serverless function
 */
export const graphEndpoint = api
  .use(cors())
  .use(responseTime())
  .use(useSentry)
  .use(createUserContext)
  .use(apiHandler)
  .use(failure);
