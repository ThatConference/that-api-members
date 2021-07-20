import debug from 'debug';

const dlog = debug('that:api:members:query:registrationProfile');

export const fieldResolvers = {
  RegistrationProfile: {
    __resolveReference({ id }, { dataSources: { profileLoader } }) {
      dlog('resolveReference registrationProfile');
      return profileLoader.load(id);
    },
  },
};
