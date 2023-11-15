import { EventEmitter } from 'events';
import * as Sentry from '@sentry/node';
import debug from 'debug';
import moment from 'moment';
import { orbitLove } from '@thatconference/api';
import slackNotifications from '../lib/slackNotifications';
import hsActions from '../lib/hubSpotActions';

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
      .catch(err =>
        process.nextTick(() => userEventEmitter.emit('error', { err, user })),
      );
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
      .catch(err =>
        process.nextTick(() => userEventEmitter.emit('error', { err, user })),
      );
  }

  function sendAccountCreatedSlack(user) {
    dlog('new account created slack notification called');
    if (user.canFeature) {
      slackNotifications.memberCreated({ user });
    }
  }

  function onAccountActionUpdateHubSpot(user) {
    // updates HubSpot when THAT profile is created or updated
    dlog('calling onAccountActionUpdateHubSpot');
    return hsActions
      .syncContactFromTHATUser(user)
      .then(r => dlog('onAccountActionUpdateHubSpot result: %o', r));
  }

  function onAccountCreateOptInNewUserOnboarding(user) {
    dlog('onAccountCreateOptInNewUserOnboarding called');
    return hsActions.subscribeNewUserOnboarding(user.email);
  }

  function onAccountUpdateEnsureNoProfileUnsubscribe(user) {
    dlog('onAccountUpdateEnsureNoProfileUnsubscribe called');
    return hsActions.unsubscribeNoProfileOnboarding(user.email);
  }

  function sendOrbitLoveActivityOnCreate(user, firestore) {
    dlog('sendOrbitLoveActicityOnCreate for %s', user.id);
    const orbitLoveApi = orbitLove.orbitLoveApi({ firestore });

    return orbitLoveApi
      .addProfileActivity({
        activityType: orbitLove.activityTypes.profile.update(),
        member: user,
      })
      .catch(err =>
        process.nextTick(() => userEventEmitter.emit('error', { err, user })),
      );
  }

  function sendOrbitLoveActivityOnUpdate(user, firestore) {
    dlog('sendOrbitLoveActivityOnUpdate for %s', user.id);
    const orbitLoveApi = orbitLove.orbitLoveApi({ firestore });

    return orbitLoveApi
      .addProfileActivity({
        activityType: orbitLove.activityTypes.profile.update(),
        member: user,
      })
      .catch(err =>
        process.nextTick(() => userEventEmitter.emit('error', { err, user })),
      );
  }

  function sendNewShareEmail({
    sharingWith,
    sharingSharedProfile,
    messageToShareWith = null,
  }) {
    dlog('sendNewShareEmail');
    return postmark
      .sendEmailWithTemplate({
        TemplateAlias: 'network-new-share-with-you',
        From: 'hello@thatconference.com',
        To: sharingWith.email,
        Tag: 'network-sharing',
        TemplateModel: {
          sharingWith: {
            firstName: sharingWith.firstName,
            lastName: sharingWith.lastName,
            email: sharingWith.email,
          },
          sharingSharedProfile,
          messageToShareWith,
        },
      })
      .catch(err =>
        process.nextTick(() =>
          userEventEmitter.emit('error', { err, user: sharingSharedProfile }),
        ),
      );
  }

  userEventEmitter.on('error', ({ err, user }) => {
    Sentry.setTag('section', 'userEventEmitter');
    Sentry.setContext('user object', { user });
    Sentry.captureException(err);
  });

  userEventEmitter.on('accountCreated', onAccountActionUpdateHubSpot);
  userEventEmitter.on('accountCreated', sendAccountCreatedEmail);
  userEventEmitter.on('accountCreated', sendAccountCreatedSlack);
  userEventEmitter.on('accountCreated', onAccountCreateOptInNewUserOnboarding);

  userEventEmitter.on('accountUpdated', onAccountActionUpdateHubSpot);
  userEventEmitter.on('accountUpdated', sendAccountUpdatedEmail);
  userEventEmitter.on(
    'accountUpdated',
    onAccountUpdateEnsureNoProfileUnsubscribe,
  );

  userEventEmitter.on('accountCreated', sendOrbitLoveActivityOnCreate);
  userEventEmitter.on('accountUpdated', sendOrbitLoveActivityOnUpdate);

  userEventEmitter.on('addNewSharingWith', sendNewShareEmail);

  return userEventEmitter;
}

export default userEvents;
