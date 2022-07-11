import * as Sentry from '@sentry/node';
// import fetch from 'node-fetch';
import fetch from '@adobe/node-fetch-retry';
import debug from 'debug';

import envConfig from '../envConfig';

const dlog = debug('that:api:members:activeCampaign');

let acBaseUrl = envConfig.activeCampaign.api;
if (acBaseUrl.endsWith('/'))
  acBaseUrl = acBaseUrl.substring(0, acBaseUrl.length - 1);
const fetchBaseOptions = {
  headers: {
    'Api-Token': envConfig.activeCampaign.key,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  retryInitialDelay: 250,
  retryBackoff: 2.0,
};
const sentryBreadcrumbBase = {
  category: 'activeCampaignRequests',
  level: 'info',
};
dlog('AC url: %s', acBaseUrl);

function findContactByEmail(email) {
  dlog('call findContactByEmail for %s', email);
  const url = `${acBaseUrl}/contacts?`;
  Sentry.addBreadcrumb({
    ...sentryBreadcrumbBase,
    message: 'findContactByEmail Called',
    data: { email, url },
  });
  const params = new URLSearchParams({ email });
  const reqOptions = {
    method: 'GET',
    ...fetchBaseOptions,
  };
  dlog('findContactByEmail fetch %s', url + params);
  return fetch(url + params, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('non-200 result from contact query by email %s', email);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext('non-200 result from  contact query by email', {
            email,
            res,
          });
          Sentry.captureMessage('non-200 result from contact query by email');
        });
        throw new Error(
          `non-200 result from list all contacts query, ${res.status}, ${res.statusText}`,
        );
      }
      return res.json();
    })
    .then(json => {
      if (json.contacts && json.contacts.length > 1) {
        dlog(
          'query for email, %s, returned %d matches, expect 1 or 0',
          email,
          json.contacts.length,
        );
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext('query by email return > 1 contact', {
            email,
            contacts: json.contacts,
          });
          Sentry.captureMessage('query by email returned > 1 contact');
        });
        throw new Error(
          `Contact search by email returned > 1 contact, ${json.contacts.length}, ${email}`,
        );
      }

      return json.contacts[0];
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
  Sentry.addBreadcrumb({
    ...sentryBreadcrumbBase,
    message: 'findContactByEmail Called',
    data: { contact, url },
  });
  const reqOptions = {
    method: 'POST',
    ...fetchBaseOptions,
    body: JSON.stringify(contact),
  };
  dlog('createContact fetch %s %o', url, reqOptions);
  return fetch(url, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('non-200 result from create contact %o', contact);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext('non-200 result from  create AC contact', {
            contact,
            res,
          });
          Sentry.captureMessage('non-200 result from sync AC contact');
        });
        throw new Error(
          `Non-200 result creating contact, ${res.status}, ${res.statusText}`,
        );
      }
      return res.json();
    })
    .then(json => json.contact);
}

function syncContact(contact) {
  // Sync contact will update or create new contact based on AC's
  // contact key, email address
  dlog('call syncContact for %o', contact);
  const url = `${acBaseUrl}/contact/sync`;
  Sentry.addBreadcrumb({
    ...sentryBreadcrumbBase,
    message: 'syncContact Called',
    data: { contact, url },
  });
  const reqOptions = {
    method: 'POST',
    ...fetchBaseOptions,
    body: JSON.stringify(contact),
  };
  dlog('synContact fetch %s %o', url, reqOptions);
  return fetch(url, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('non-200 result from sync contact %o', contact);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext('non-200 result from  syc AC contact', {
            contact,
            res,
          });
          Sentry.captureMessage('non-200 result from sync AC contact');
        });
        throw new Error(
          `Non-200 result syncing contact, ${res.status}, ${res.statusText}`,
        );
      }
      return res.json();
    })
    .then(json => json.contact);
}

function searchForTag(tagName) {
  dlog('search for tag %s', tagName);
  const url = `${acBaseUrl}/tags?`;
  Sentry.addBreadcrumb({
    ...sentryBreadcrumbBase,
    message: 'searchForTag Called',
    data: { tagName, url },
  });
  const params = new URLSearchParams({ search: tagName });
  const reqOptions = {
    method: 'GET',
    ...fetchBaseOptions,
  };
  dlog('fetch %s', url + params);
  return fetch(url + params, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('non-200 result from search for tag %s', tagName);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext('non-200 result from search for tag', {
            tagName,
            res,
          });
          Sentry.captureMessage('non-200 result from search for tag');
        });
        throw new Error(
          `non-200 status return searching for tag, ${tagName}, ${res.status}, ${res.statusText}`,
        );
      }
      return res.json();
    })
    .then(json => {
      if (json.tags && json.tags.length > 1) {
        dlog(
          'query for tag, %s, returned %d matches, expect 1 or 0',
          tagName,
          json.tags.length,
        );
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext('Tag search return > 1 contact', {
            tagName,
            tags: json.tags,
          });
          Sentry.captureMessage('query for tag returned > 1 contact');
        });
        throw new Error(
          `Tag search returned > 1 tag. Expected 0 or 1, ${json.tags.length}, ${tagName}`,
        );
      }

      return json.tags[0];
    });
}

function addTagToContact(acId, tagId) {
  dlog('call addTagToContact for id %s adding tag %s', acId, tagId);
  const url = `${acBaseUrl}/contactTags`;
  Sentry.addBreadcrumb({
    ...sentryBreadcrumbBase,
    message: 'addTagToContact Called',
    data: { acId, tagId, url },
  });
  const bodyval = {
    contactTag: {
      contact: acId,
      tag: tagId,
    },
  };
  const reqOptions = {
    method: 'POST',
    ...fetchBaseOptions,
    body: JSON.stringify(bodyval),
  };
  dlog('addTagToContact fetch %s %o', url, reqOptions);
  return fetch(url, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('issue adding tag to contact %d %s', res.status, res.statusText);
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext('Issue adding tag to contact', { acId, tagId, res });
          Sentry.captureMessage('issue adding tag to contact');
        });
        throw new Error(
          `Unable to add tag to contact, ${{ acId }}, ${{ tagId }}, ${
            res.status
          }, ${res.statusText}`,
        );
      }
      return res.json();
    })
    .then(json => json);
}

function searchForList(listName) {
  dlog('search for list %s', listName);
  const url = `${acBaseUrl}/lists?`;
  Sentry.addBreadcrumb({
    ...sentryBreadcrumbBase,
    message: 'searchForList Called',
    data: { listName, url },
  });
  const params = new URLSearchParams({ 'filters[name]': listName });
  const reqOptions = {
    method: 'GET',
    ...fetchBaseOptions,
  };
  dlog('fetch %s', url + params);
  return fetch(url + params, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog('non-200 result from search for list %s', listName);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext('non-200 result from search for list', {
            listName,
            res,
          });
          Sentry.captureMessage('non-200 result from search for list');
        });
        throw new Error(
          `non-200 status return searching for list, ${listName}, ${res.status}, ${res.statusText}`,
        );
      }
      return res.json();
    })
    .then(json => {
      if (json.lists && json.lists.length > 1) {
        dlog(
          'query for list, %s, returned %d matches, expect 1 or 0',
          listName,
          json.lists.length,
        );
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext('list search return > 1 contact', {
            listName,
            lists: json.lists,
          });
          Sentry.captureMessage('query for list returned > 1 contact');
        });
        throw new Error(
          `list search returned > 1 list. Expected 0 or 1', ${json.lists.length}, ${listName}`,
        );
      }

      return json.lists[0];
    });
}

function setContactToList({ acId, listId, status = '1' }) {
  // https://developers.activecampaign.com/reference#update-list-status-for-contact
  // statuses: '1': subscribe, '2': unsubscribe
  dlog('call setContactToList for id %s to list %s', acId, listId);
  const url = `${acBaseUrl}/contactLists`;
  Sentry.addBreadcrumb({
    ...sentryBreadcrumbBase,
    message: 'setContactToList Called',
    data: { acId, listId, status, url },
  });
  const bodyval = {
    contactList: {
      list: listId,
      contact: acId,
      status,
    },
  };
  if (status === '1') bodyval.contactList.sourceid = 4;
  const reqOptions = {
    method: 'POST',
    ...fetchBaseOptions,
    body: JSON.stringify(bodyval),
  };
  dlog('setContactToList fetch %s %o', url, reqOptions);
  return fetch(url, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog(
          'issue setting contact to list %d %s',
          res?.status,
          res?.statusText,
        );
        const e = new Error(
          `Unable to add contact to list ${{ acId }},${{ listId }}:${
            res.status
          },${res.statusText}`,
        );
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext('Issue setting contact to list', {
            acId,
            listId,
            status,
            res,
          });
          Sentry.captureException(e);
        });
        throw e;
      }
      return res.json();
    })
    .then(json => json);
}

function isContactInList({ acId, listId }) {
  // https://developers.activecampaign.com/reference/retrieve-contact-list-memberships
  // statuses: '1': subscribe, '2': unsubscribe, '3': email bounced, '0': unconfirmed
  dlog(`call isContactInList for id %s, list %s`, acId, listId);
  const url = `${acBaseUrl}/contacts/${acId}/contactLists`;
  Sentry.addBreadcrumb({
    ...sentryBreadcrumbBase,
    message: 'isContactInList Called',
    data: { acId, listId, url },
  });
  const reqOptions = {
    method: 'GET',
    ...fetchBaseOptions,
  };

  return fetch(url, reqOptions)
    .then(res => {
      if (!res.ok) {
        dlog(
          'Unable to query Active Campaign API for contact list info id: %s, list: %s',
          acId,
          listId,
        );
        const e = new Error(
          `Unable to query AC API for contact list membership (id, list): ${{
            acId,
          }},${{ listId }}`,
        );
        Sentry.withScope(scope => {
          scope.setLevel('error');
          scope.setContext('Issue querying list membership', { acId, listId });
          Sentry.captureException(e);
        });
        throw e;
      }
      return res.json();
    })
    .then(json => {
      const { contactLists } = json;
      // eslint-disable-next-line eqeqeq
      const targetList = contactLists.find(l => l?.list == listId);
      dlog('contact targetList found: %o', targetList);
      // eslint-disable-next-line eqeqeq
      return targetList?.status == 1;
    });
}

export default {
  findContactByEmail,
  createContact,
  syncContact,
  searchForTag,
  addTagToContact,
  searchForList,
  setContactToList,
  isContactInList,
};
