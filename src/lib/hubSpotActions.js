// wrapped interactions with the HubSpot API
import * as Sentry from '@sentry/node';
import debug from 'debug';
import hubspot from './hubSpot';
import envConfig from '../envConfig';

const dlog = debug('that:api:members:hubSpotActions');

function syncContactFromTHATUser(user) {
  // updates HubSpot with values from THAT Profile (prop user)
  // null returns indicate error interacting with HubSpot
  // syncing assumes THAT profile exists
  dlog('syncContactFromTHATUser, user: %o', user);
  const properties = {
    THATmemberId: user.id,
    THATProfileComplete: true,
    SetAsMarketingContact: true,
  };
  if (user.firstName) properties.firstName = user.firstName;
  if (user.lastName) properties.lastName = user.lastName;
  if (user.profileSlug) properties.tcwebsiteusername = user.profileSlug;

  return hubspot
    .createOrUpdateContact({ email: user.email, properties })
    .catch(err => {
      Sentry.setContext('properties', properties);
      Sentry.setTag('email', user.email);
      Sentry.captureException(err);
    });
}

function subscribeNewUserOnboarding(email) {
  // subscribes provided user to new user onboarding subscription (HubSpot)
  dlog('subscribeNewUserOnboarding called');
  const subscriptionId = envConfig.hubspot.newUserOnboardingId;
  return hubspot
    .subscribeContact({ email, subscriptionId })
    .then(r => dlog('subscription result: %o', r))
    .catch(err => {
      Sentry.setTags({
        email,
        subscriptionId,
      });
      Sentry.captureException(err);
    });
}

function unsubscribeNoProfileOnboarding(email) {
  dlog('unsubscribeNoProfileOnboarding called, %s', email);
  const subscriptionId = envConfig.hubspot.profileOnboardingId;
  return hubspot
    .unsubscribeContact({ email, subscriptionId })
    .then(r => dlog('unsubscribe result: %o', r))
    .catch(err => {
      Sentry.setTags({
        email,
        subscriptionId,
      });
      Sentry.captureException(err);
    });
}

function setContactWithCompleteProfile(user) {
  dlog('setContactWithCompleteProfile called on %s', user.email);
  const properties = {
    THATProfileComplete: true,
  };
  return hubspot
    .createOrUpdateContact({ email: user.email, properties })
    .catch(err => {
      Sentry.setContext('properties', properties);
      Sentry.setTag('email', user.email);
      Sentry.captureException(err);
    });
}

function findContactNewletterSubscription(email) {
  dlog('isContactSubscribedToNewletter, %s', email);
  const subscriptionId = envConfig.hubspot.newsletterId;
  return hubspot.findOptStatus({ email, subscriptionId }).catch(err => {
    Sentry.setTags({ email, subscriptionId });
    Sentry.captureException(err);
  });
}

export default {
  syncContactFromTHATUser,
  subscribeNewUserOnboarding,
  unsubscribeNoProfileOnboarding,
  setContactWithCompleteProfile,
  findContactNewletterSubscription,
};
