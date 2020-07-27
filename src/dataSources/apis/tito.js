import debug from 'debug';
import fetch from 'isomorphic-unfetch';

const dlog = debug('that:api:members:datasource:apis');

const checkinslug = process.env.CHECKIN_SLUG || 'pmRx6nSzJo7X0mVRxtd0Zyg';
const titocheckinbase = `https://checkin.tito.io/checkin_lists/${checkinslug}/`;

const tito = () => {
  dlog('tito instance created');

  async function checkInTicket(ticketRef) {
    dlog('checkin ticket');

    let isGoodTicket = false;
    let ticket = {};
    let result = {};

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    const tickets = await fetch(`${titocheckinbase}tickets`, options).then(
      async r => {
        if (r.ok) {
          const data = await r.json();
          if (data) return data;
        }
        return [];
      },
    );

    // TODO: Handle no tickets returned
    dlog('%d tickets returned from Tito', tickets.length);
    const record = tickets.filter(
      t => t.reference.toLowerCase() === ticketRef.toLowerCase(),
    );
    dlog('ticket record filtered %O', record);
    if (record.length === 0) {
      dlog('no ticket found');
      isGoodTicket = false;
    } else if (record.length > 1) {
      dlog(
        'multiple tickets found, was registration reference provided instead of ticket reference?',
      );
      isGoodTicket = false;
    } else {
      isGoodTicket = true;
    }

    if (isGoodTicket) {
      [ticket] = record;
      const payload = {
        checkin: {
          ticket_id: ticket.id,
        },
      };
      options.method = 'POST';
      options.body = payload;

      result = fetch(`${titocheckinbase}checkins`, options).then(async r => {
        if (r.ok) {
          const data = await r.json();
          if (data) return data;
        }
        return {};
      });
    }

    return {
      isGoodTicket,
      ticket,
      result,
    };
  }

  return { checkInTicket };
};

export default tito;
