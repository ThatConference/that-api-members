import { EventEmitter } from 'events';
import debug from 'debug';
import moment from 'moment';
import slackNotifications from '../lib/slackNotifications';
import acActions from '../lib/activeCampaignActions';

const dlog = debug('that:api:members:events:user');

function userEvents(postmark) {
  const userEventEmitter = new EventEmitter();
  dlog('user event emitter created');

  function sendAccountCreatedEmail(user) {
    dlog('new account created send email fired');
    return postmark
      .sendEmailWithTemplate({
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
      })
      .then(dlog('email sent'))
      .catch(e => process.nextTick(() => userEventEmitter.emit('error', e)));
  }

  function sendAccountUpdatedEmail(user) {
    dlog('account updated send email event fired');
    return postmark
      .sendEmailWithTemplate({
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
      })
      .then(dlog('email sent'))
      .catch(e => process.nextTick(() => userEventEmitter.emit('error', e)));
  }

  function sendAccountCreatedSlack(user) {
    dlog('new account created slack notification called');
    if (user.canFeature) {
      slackNotifications.memberCreated({ user });
    }
  }

  function addAcProfileCompleteTag(user) {
    dlog('accountCreated Add THATProfileComplete tag in AC');
    acActions
      .addTagToContact('THATProfileComplete', user)
      .then(r => dlog('add tag to contact result %o', r))
      .catch(err =>
        process.nextTick(() => userEventEmitter.emit('error', err)),
      );
  }

  userEventEmitter.on('error', err => {
    throw new Error(err);
  });

  userEventEmitter.on('accountCreated', sendAccountCreatedEmail);
  userEventEmitter.on('accountCreated', sendAccountCreatedSlack);
  // userEventEmitter.on('accountCreated', addAcProfileCompleteTag);
  userEventEmitter.on('accountUpdated', sendAccountUpdatedEmail);

  return userEventEmitter;
}

export default userEvents;
