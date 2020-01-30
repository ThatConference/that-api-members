/* eslint-disable no-underscore-dangle */
/* eslint-disable import/prefer-default-export */
import debug from 'debug';

const dlog = debug('that:api:members:query');

export const fieldResolvers = {
  Profile: {
    __resolveReference({ id }) {
      dlog('Profile:federated resolveRef');

      const data = {
        '1234': {
          id: '1234',
          firstName: 'Clark',
          lastName: 'Sell',
          jobTitle: 'Founder',
          profileImage:
            'https://that.imgix.net/members/5eb2aa8d-4b18-4225-beed-39961b653365.jpeg',
        },
        '4321': {
          id: '4321',
          firstName: 'Jimmy',
          lastName: 'Johns',
          jobTitle: 'EATER',
          profileImage:
            'https://that.imgix.net/members/5eb2aa8d-4b18-4225-beed-39961b653365.jpeg',
        },
      };

      if (id === '1234' || id === '4321') {
        return data[id];
      }

      return {
        id: 'WAT',
        firstName: 'a',
        lastName: 'b',
        jobTitle: 'EATER',
        profileImage:
          'https://that.imgix.net/members/5eb2aa8d-4b18-4225-beed-39961b653365.jpeg',
      };
    },
  },
};
