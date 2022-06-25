/* eslint-disable no-use-before-define */
// Provides common interations with Active Campaign API.
// depends on our Active Campaign library
import * as Sentry from '@sentry/node';
import debug from 'debug';
import ac from './activeCampaign';
import envConfig from '../envConfig';

const dlog = debug('that:api:members:activeCampaignActions');

async function createNewAcContact(user) {
  dlog('createNewAcContact');
  const contact = {
    contact: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
  const newContact = await ac.createContact(contact);
  if (!newContact) {
    dlog(`failed creating contact in AC %o`, contact);
    Sentry.setContext('AC Contact', contact);
    Sentry.captureMessage('failed creating contact in AC', 'error');
    throw new Error(
      `Failed creating contact in AC, ${JSON.stringify(contact)}`,
    );
  }
  dlog('contact created %s', newContact.id);
  return newContact.id;
}

async function syncAcContactFromTHATUser(user) {
  // Updates AC contact with values from THAT Profile (here as 'user')
  // ---
  // Returning null during failures to ensure the AC platform doesn't interfere
  // with our platform. We'll gracefully deal with AC failing.
  dlog('syncAcContactFromTHATUser, user %o', user);
  const contact = {
    contact: {
      email: user.email,
    },
  };
  if (user.firstName) contact.contact.firstName = user.firstName;
  if (user.lastName) contact.contact.lastName = user.lastName;

  let newContact = null;
  try {
    newContact = await ac.syncContact(contact);
  } catch (err) {
    Sentry.setContext('AC Contact', contact);
    Sentry.captureException(err);
    return null;
  }

  if (!newContact) {
    dlog(`failed synching contact in AC %o`, contact);
    Sentry.setContext('AC Contact', contact);
    Sentry.captureException(
      new Error(
        `Failed synching contact in AC (no result), ${JSON.stringify(contact)}`,
      ),
    );
    return null;
  }
  dlog('contact syncd %s', newContact.id);
  return newContact.id;
}

async function addTagToContact({ tagName, user }) {
  // Add a tag to a contact based on email address.
  // If the user isn't an AC contact they will be added.
  dlog('call addTagToContact for tag %s and user %o', tagName, user);
  const [contactResult, tagResult] = await Promise.all([
    ac.findContactByEmail(user.email),
    ac.searchForTag(tagName),
  ]);
  dlog('contactResult %o', contactResult);
  dlog('tagResult %o', tagResult);
  if (!tagResult || (tagResult && !tagResult.id)) {
    dlog(`tag, ${tagName}, not found at AC`);
    Sentry.captureMessage(`Tag ${tagName} not found in AC`, 'error');
    throw new Error(`unable to find tag in AC. Cannot continue, ${tagName}`);
  }
  const tagId = tagResult.id;
  let contactId = '';
  if (!contactResult || (contactResult && !contactResult.id)) {
    contactId = await syncAcContactFromTHATUser(user);
  } else {
    contactId = contactResult.id;
  }

  const taggedContact = await ac.addTagToContact(contactId, tagId);
  if (!taggedContact) {
    dlog(`Tag didn't set to contact`);
    Sentry.captureMessage('failed adding tag to contact in AC', 'error');
    throw new Error(
      'Failed adding tag to contact in AC',
      { tagId },
      { contactId },
    );
  }
  return taggedContact;
}

function addContactToList({ user, listName }) {
  const isAddToList = true;
  return changeListSubscription({ user, listName, isAddToList });
}

function removeContactFromList({ user, listName }) {
  const isAddToList = false;
  return changeListSubscription({ user, listName, isAddToList });
}

async function changeListSubscription({ user, listName, isAddToList }) {
  // add a contact, based on email address, to a list
  // if the user isn't an AC contanct they will be added.
  // ---
  // Returning null during failures to ensure the AC platform doesn't interfere
  // with our platform. We'll gracefully deal with AC failing.
  dlog('call addContactToList for %o into list %s', user, listName);
  let contactResult = null;
  let listResult = null;
  try {
    [contactResult, listResult] = await Promise.all([
      ac.findContactByEmail(user.email),
      ac.searchForList(listName),
    ]);
  } catch (err) {
    Sentry.setContext('email', user.email);
    Sentry.setContext('AC listName', listName);
    Sentry.captureException(err);
    return null;
  }
  dlog('contactResult %o', contactResult);
  dlog('listResult %o', listResult);
  if (!listResult || (listResult && !listResult.id)) {
    dlog(`list, ${listName}, not found in AC`);
    Sentry.captureMessage(`List ${listName} not found in AC`, 'error');
    return null;
  }
  const listId = listResult.id;
  let contactId = '';
  if (!contactResult || (contactResult && !contactResult.id)) {
    contactId = await syncAcContactFromTHATUser(user);
  } else {
    contactId = contactResult.id;
  }
  if (contactId === null) return null;

  // list subscribtion status: active: 1, unsubscribe: 2
  const status = isAddToList === true ? 1 : 2;

  let contactInList;
  try {
    contactInList = await ac.setContactToList({
      acId: contactId,
      listId,
      status,
    });
  } catch (err) {
    Sentry.setContext('listName', listName);
    Sentry.setContext('list status', status);
    Sentry.captureException(err);
    return null;
  }
  if (!contactInList) {
    dlog(`contact %o wasn't added to list %s`, user, listName);
    Sentry.setContext('email', user.email);
    Sentry.setContext('contactId', contactId);
    Sentry.setContext('listId', listId);
    const e = new Error(
      `Failed adding contact to list in AC, contactId: ${contactId}, listId: ${listId},`,
    );
    Sentry.captureException(e);
    return null;
  }
  return contactInList;
}

function setRegisteredFromFieldValue(email, fieldValue) {
  // update user with registered from field value
  // Common value for this field is user.site
  dlog(
    'call setRegisteredFieldValueToContact for %s field value %s',
    email,
    fieldValue,
  );
  const contact = {
    contact: {
      email,
      fieldValues: [
        {
          field: envConfig.activeCampaign.RegisteredFromField,
          value: fieldValue,
        },
      ],
    },
  };
  return ac.syncContact(contact).then(r => r);
}

async function isContactSubscribedToList({ user, listName }) {
  // returns bool of List active membership
  // ---
  // Returning null during failures to ensure the AC platform doesn't interfere
  // with our platform. We'll gracefully deal with AC failing.
  Sentry.setContext('email', user.email);
  let contactResult;
  let listResult;
  try {
    [contactResult, listResult] = await Promise.all([
      ac.findContactByEmail(user.email),
      ac.searchForList(listName),
    ]);
  } catch (err) {
    Sentry.setContext('AC listName', listName);
    Sentry.captureException(err);
    return null;
  }

  dlog('contactResult %o', contactResult);
  dlog('listResult %o', listResult);
  if (!listResult?.id) {
    dlog(`list, ${listName}, not found in AC`);
    const e = new Error('unable to find list in AC. Cannot continue', {
      listName,
    });
    Sentry.captureException(e);
    return null;
  }
  const listId = listResult.id;
  let contactId = '';
  if (!contactResult?.id) {
    return Promise.resolve(false);
  }
  contactId = contactResult.id;

  let result;
  try {
    result = ac.isContactInList({ acId: contactId, listId });
  } catch (err) {
    Sentry.setContext('AC id', contactId);
    Sentry.setContext('AC list id', listId);
    Sentry.captureException(err);
    return null;
  }
  return result;
}

export default {
  createNewAcContact,
  syncAcContactFromTHATUser,
  addTagToContact,
  addContactToList,
  removeContactFromList,
  setRegisteredFromFieldValue,
  isContactSubscribedToList,
};
