import * as Sentry from '@sentry/node';
import fetch from 'node-fetch';
import debug from 'debug';

import envConfig from '../envConfig';

const dlog = debug('that:api:members:activeCampaign');

let acBaseUrl = envConfig.activeCampaignApi;
if (acBaseUrl.endsWith('/'))
  acBaseUrl = acBaseUrl.substring(0, acBaseUrl.length - 1);
const fetchBaseOptions = {
  headers: {
    'Api-Token': envConfig.activeCampaignKey,
    'Content-Type': 'application/json',
  },
};

function findContactByEmail(email) {
  dlog('call findContactByEmail for %s', email);
  const url = `${acBaseUrl}/contacts?`;
  const params = new URLSearchParams({ email });
  const reqOptions = {
    method: 'GET',
    ...fetchBaseOptions,
  };
  return fetch(url + params, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('non-200 result from contact query by email %s', email);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext(
            'non-200 result from  contact query by email',
            { email },
            { res },
          );
          Sentry.captureMessage('non-200 result from contact query by email');
        });
        return undefined;
      }
      return res.json();
    })
    .then(json => {
      if (!json) return undefined;
      if (json.contacts && json.contacts.length > 1) {
        dlog(
          'query for email, %s, returned %d matches, expect 1 or 0',
          email,
          json.contacts.length,
        );
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext(
            'query by email return > 1 contact',
            { email },
            { contacts: json.contacts },
          );
          Sentry.captureMessage('query by email returned > 1 contact');
        });
        return undefined;
      }
      dlog(`returning ${json.contacts[0]}`);
      return json.contacts[0];
    })
    .catch(err => {
      dlog('exception looking for contact: %s', err);
      Sentry.captureException(err);
      return undefined;
    });
}

function createContact(contact) {
  // https://developers.activecampaign.com/reference#create-a-contact-new
  /* minimum required for payload
    {
      contact: {
        email: email@email.com,
      }
    }
  */
  dlog('call createContact for %o', contact);
  const url = `${acBaseUrl}/contacts`;
  const reqOptions = {
    method: 'POST',
    ...fetchBaseOptions,
    body: contact,
  };
  return fetch(url, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('non-200 result from create contact %o', contact);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext(
            'non-200 result from  create AC contact',
            { contact },
            { res },
          );
          Sentry.captureMessage('non-200 result from sync AC contact');
        });
        return undefined;
      }
      return res.json();
    })
    .then(json => json.contact)
    .catch(err => {
      dlog('exception creating AC contact: %s', err);
      Sentry.captureException(err);
      return undefined;
    });
}

function syncContact(contact) {
  // Sync contact will update or create new contact based on AC's
  // contact key, email address
  dlog('call syncContact for %o', contact);
  const url = `${acBaseUrl}/contact/sync`;
  const reqOptions = {
    method: 'POST',
    ...fetchBaseOptions,
    body: contact,
  };
  return fetch(url, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('non-200 result from sync contact %o', contact);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext(
            'non-200 result from  syc AC contact',
            { contact },
            { res },
          );
          Sentry.captureMessage('non-200 result from sync AC contact');
        });
        return undefined;
      }
      return res.json();
    })
    .then(json => json.contact)
    .catch(err => {
      dlog('exception syncing AC contact: %s', err);
      Sentry.captureException(err);
      return undefined;
    });
}

function searchForTag(tagName) {
  dlog('search for tag %s', tagName);
  const url = `$acBaseUrl}/tags?`;
  const params = new URLSearchParams({ search: tagName });
  const reqOptions = {
    method: 'GET',
    ...fetchBaseOptions,
  };
  return fetch(url + params, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('non-200 result from search for tag %s', tagName);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext(
            'non-200 result from search for tag',
            { tagName },
            { res },
          );
          Sentry.captureMessage('non-200 result from search for tag');
        });
        return undefined;
      }
      return res.json();
    })
    .then(json => {
      if (!json) return undefined;
      if (json.tags && json.tags.length > 1) {
        dlog(
          'query for tag, %s, returned %d matches, expect 1 or 0',
          tagName,
          json.tags.length,
        );
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext(
            'Tag search return > 1 contact',
            { tagName },
            { tags: json.tags },
          );
          Sentry.captureMessage('query for tag returned > 1 contact');
        });
        return undefined;
      }
      return json.tags[0];
    })
    .catch(err => {
      dlog('exception searching for tag: %s', err);
      Sentry.captureException(err);
      return undefined;
    });
}

function addTagToContact(acId, tagId) {
  dlog('call addTagToContact for id %s adding tag %s', acId, tagId);
  const url = `${acBaseUrl}/contactTags`;
  const reqOptions = {
    method: 'POST',
    ...fetchBaseOptions,
    body: {
      contactTag: {
        contact: acId,
        tag: tagId,
      },
    },
  };
  return fetch(url, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('issue adding tag to contact');
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext(
            'Issue adding tag to contact',
            { acId },
            { tagId },
            { res },
          );
          Sentry.captureMessage('issue adding tag to contact');
        });
        return undefined;
      }
      return res.json();
    })
    .then(json => json)
    .catch(err => {
      dlog('Exception adding tag: %s', err);
      Sentry.captureException(err);
      return undefined;
    });
}

export default {
  findContactByEmail,
  createContact,
  syncContact,
  searchForTag,
  addTagToContact,
};
