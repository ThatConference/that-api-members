import { EventEmitter } from 'events';
import debug from 'debug';
import moment from 'moment';

const dlog = debug('that:api:sessions:events:user');

function userEvents(postmark) {
  const userEventEmitter = new EventEmitter();
  dlog('user event emitter created');

  function newAccountCreated(user) {
    dlog('new account created fired');
    postmark.sendEmailWithTemplate({
      // TemplateId: 15580573,
      TemplateAlias: 'MemberCreated',
      From: 'Hello@THATConference.com',
      To: user.email,
      TemplateModel: {
        member: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          createdAt: moment(user.createdAt).format('M/D/YYYY h:mm:ss A'),
        },
      },
    });
  }

  function accountUpdated(user) {
    dlog('account updated event fired');
    postmark.sendEmailWithTemplate({
      // TemplateId: 15579922,
      TemplateAlias: 'MemberUpdated',
      From: 'hello@thatconference.com',
      To: user.email,
      TemplateModel: {
        member: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          lastUpdatedAt: moment(user.lastUpdatedAt).format(
            'M/D/YYYY h:mm:ss A',
          ),
        },
      },
    });
  }

  userEventEmitter.on('newAccountCreated', newAccountCreated);
  userEventEmitter.on('accountUpdated', accountUpdated);

  return userEventEmitter;
}

export default userEvents;
