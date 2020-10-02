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
    Sentry.captureMessage('failed creating contact in AC', 'error');
    throw new Error('Failed creating contact in AC', { contact });
  }
  dlog('contact created %s', newContact.id);
  return newContact.id;
}

async function syncAcContactFromTHATUser(user) {
  // Updates AC contact with values from THAT Profile (here as 'user')
  dlog('syncAcContactFromTHATUser, user %o', user);
  const contact = {
    contact: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
  const newContact = await ac.syncContact(contact);
  if (!newContact) {
    dlog(`failed synching contact in AC %o`, contact);
    Sentry.captureMessage('failed synching contact in AC', 'error');
    throw new Error('Failed synching contact in AC', { contact });
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
    throw new Error('unable to find tag in AC. Cannot continue', { tagName });
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

async function addContactToList({ user, listName }) {
  // add a contact, based on email address, to a list
  // if the user isn't an AC contanct they will be added.
  dlog('call addContactToList for %o into list %s', user, listName);
  const [contactResult, listResult] = await Promise.all([
    ac.findContactByEmail(user.email),
    ac.searchForList(listName),
  ]);
  dlog('contactResult %o', contactResult);
  dlog('listResult %o', listResult);
  if (!listResult || (listResult && !listResult.id)) {
    dlog(`list, ${listName}, not found in AC`);
    Sentry.captureMessage(`List ${listName} not found in AC`, 'error');
    throw new Error('unable to find list in AC. Cannot continue', { listName });
  }
  const listId = listResult.id;
  let contactId = '';
  if (!contactResult || (contactResult && !contactResult.id)) {
    contactId = await syncAcContactFromTHATUser(user);
  } else {
    contactId = contactResult.id;
  }

  const contactInList = await ac.setContactToList({
    acId: contactId,
    listId,
    status: '1',
  });
  if (!contactInList) {
    dlog(`contact wasn't added to list`);
    Sentry.captureMessage('failed adding contact to list in AC', 'error');
    throw new Error(
      'Failed adding contact to list in AC',
      { contactId },
      { listId },
    );
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
          field: envConfig.acRegisteredFromField,
          value: fieldValue,
        },
      ],
    },
  };
  return ac.syncContact(contact).then(r => r);
}

export default {
  createNewAcContact,
  syncAcContactFromTHATUser,
  addTagToContact,
  addContactToList,
  setRegisteredFromFieldValue,
};
