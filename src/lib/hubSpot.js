import * as Sentry from '@sentry/node';
import fetch from '@adobe/node-fetch-retry';
import debug from 'debug';
import envConfig from '../envConfig';

const dlog = debug('that:api:members:hubSpot');

let hsBaseUrl = envConfig.hubspot.api;
if (hsBaseUrl.endsWith('/'))
  hsBaseUrl = hsBaseUrl.substring(0, hsBaseUrl.length - 1);
const sharedOptions = {
  headers: {
    Authorization: `Bearer ${envConfig.hubspot.token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};

function findContactByEmail(email) {
  dlog('findContactByEmail called for %s', email);
  const url = `${hsBaseUrl}/contacts/v1/contact/email/${email}/profile?propertyMode=value_only`;
  dlog('url: %s', url);
  const options = {
    method: 'GET',
    ...sharedOptions,
  };
  return fetch(url, options).then(response => {
    const { status } = response;
    if (!response.ok) {
      dlog(
        'non-200 result, findContactByEmail, %s, %s',
        email,
        response.status,
      );
      if (status === 404) {
        dlog('Contact %s, not found', email);
        return {};
      }
      // sentry here
      Sentry.withScope(scope => {
        scope.setLevel('error');
        scope.setTag('email', email);
        Sentry.captureException(
          new Error(`Status ${status} returned from findContactByEmail`),
        );
      });
      return null;
    }

    return response.json();
  });
}

function createOrUpdateContact({ email, properties }) {
  const url = `${hsBaseUrl}/contacts/v1/contact/createOrUpdate/email/${email}`;
  dlog('url: %s', url);
  const data = {
    properties: Object.entries(properties).map(([k, v]) => ({
      property: k,
      value: v,
    })),
  };

  const options = {
    url,
    method: 'post',
    ...sharedOptions,
    body: JSON.stringify(data),
  };
  return fetch(url, options)
    .then(response => {
      const { status } = response;
      if (!response.ok) {
        dlog('Non-200 result, createOrUpdateContact, %s', status);
        let msg;
        if (status === 409) {
          // email address conflict
          msg = `status 409, email address conflict updating ${email}`;
        }
        Sentry.withScope(scope => {
          scope.setTags({
            url,
            email,
            status,
          });
          scope.setContext('options', options);
          Sentry.captureException(new Error(msg));
        });
        // return {};
      }
      // e.g. { vid: 15251, isNew: false }
      return response.json();
    })
    .then(json => {
      if (!json?.vid) {
        Sentry.withScope(scope => {
          scope.setTags({
            email,
            function: 'createOrUpdateContact',
            url,
          });
          scope.setContext('returned json', { json: JSON.stringify(json) });
          scope.setContext('options', options);
          Sentry.captureException(new Error('Error response from HubSpot'));
        });
      }
    });
}

function subscribeContact({ email, subscriptionId }) {
  dlog('subscribeContact called');
  dlog('subscribe %s to %s sub', email, subscriptionId);
  const url = `${hsBaseUrl}/communication-preferences/v3/subscribe`;
  const data = {
    emailAddress: email,
    subscriptionId,
  };
  const options = {
    method: 'POST',
    ...sharedOptions,
    body: JSON.stringify(data),
  };
  return fetch(url, options)
    .then(response => {
      const { status } = response;
      if (!response.ok) {
        dlog('Non-200 result, subscribeContact, %s', status);
        if (status === 400) {
          // error subscribing user
          /* --example response
            {
              "status": "error",
              "message": "<email> is already subscribed to subscription 58687837",
              "correlationId": "5a5aa01c-db51-4bb2-8a19-11fa36e2b7d6",
              "category": "VALIDATION_ERROR"
            }
          */
          return response.json();
        }
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setTags({
            email,
            subscriptionId,
          });
          Sentry.captureException(
            new Error(`Status ${status} returned from subscribeContact`),
          );
        });
        return null;
      }
      /* --example response
        {
          "id": "58687837",
          "name": "<name of sub>",
          "description": "<descriptiong of sub>",
          "status": "SUBSCRIBED",
          "sourceOfStatus": "SUBSCRIPTION_STATUS",
          "brandId": null,
          "preferenceGroupName": null,
          "legalBasis": "",
          "legalBasisExplanation": ""
        }
      */

      return response.json();
    })
    .then(json => {
      dlog('response %O', json);
      if (json?.status === 'error') {
        Sentry.withScope(scope => {
          scope.setLevel('info');
          scope.setTags({ url, email, subscriptionId });
          scope.setContext('HubSpot Result', json);
          Sentry.captureMessage(`Error result subscribing contact`);
        });
      }

      return json;
    });
}

function unsubscribeContact({ email, subscriptionId }) {
  dlog('unsubscribe %s from %s', email, subscriptionId);
  const url = `${hsBaseUrl}/communication-preferences/v3/unsubscribe`;
  const data = {
    emailAddress: email,
    subscriptionId,
  };
  const options = {
    method: 'POST',
    ...sharedOptions,
    body: JSON.stringify(data),
  };
  return fetch(url, options)
    .then(response => {
      const { status, ok } = response;
      if (!ok) {
        dlog('non-200 result, unsubscribeContact, %s, status');
        if (status === 400) {
          // see subscribeContact for reponse example
          return response.json();
        }
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setTags({
            email,
            subscriptionId,
          });
          Sentry.captureException(
            new Error(`Status ${status} returned from unsubscribeContact`),
          );
        });
        return null;
      }

      return response.json();
    })
    .then(json => {
      dlog('response %O', json);
      if (
        json?.status === 'error' &&
        !json?.message?.includes('already unsubscribed')
      ) {
        Sentry.withScope(scope => {
          scope.setLevel('info');
          scope.setTags({ url, email, subscriptionId });
          scope.setContext('HubSpot Result', json);
          Sentry.captureMessage(`Error result unsubscribing contact`);
        });
      }

      return json;
    });
}

function findOptStatus({ email, subscriptionId }) {
  dlog('finding optStatus for %s on %s', email, subscriptionId);
  const url = `${hsBaseUrl}/email/public/v1/subscriptions/${email}`;
  const options = {
    method: 'GET',
    ...sharedOptions,
  };
  return fetch(url, options)
    .then(response => {
      const { status, ok } = response;
      if (!ok) {
        dlog('non-200 response, findOptOutStatus, %s', status);
        const msg = `${status} status response from hubspot subscriptions end point`;
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setTags({
            email,
            subscriptionId,
            url,
            status,
          });
          Sentry.captureException(new Error(msg));
          return null;
        });
      }
      return response.json();
    })
    .then(json => {
      if (json === null) return json;

      const { subscriptionStatuses } = json;
      const subscription = subscriptionStatuses.find(
        s => s?.id?.toString() === subscriptionId?.toString(),
      );
      dlog('subscription found: %o', subscription);
      let result = 'NOT_SPECIFIED';
      if (subscription?.optState === 'OPT_IN') result = 'OPT_IN';
      else if (subscription?.optState === 'OUT_OUT') result = 'OPT_OUT';

      return result;
    });
}

export default {
  findContactByEmail,
  createOrUpdateContact,
  subscribeContact,
  unsubscribeContact,
  findOptStatus,
};
