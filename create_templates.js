require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error("Missing Twilio credentials in .env.local");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function createTemplates() {
  try {
    // 2. Event Preview Card Template
    const cardTemplate = await client.content.v1.contents.create({
      friendlyName: 'Eventa Event Preview Card',
      language: 'en',
      variables: {
        '1': 'Event Image URL',
        '2': 'Event Title',
        '3': 'Event Description'
      },
      types: {
        'twilio/card': {
          title: '{{2}}',
          body: '{{3}}',
          media: ['{{1}}'],
          actions: [
            {
              type: 'QUICK_REPLY',
              title: 'Buy Tickets',
              id: 'buy_ticket'
            },
            {
              type: 'QUICK_REPLY',
              title: 'Back to Menu',
              id: 'main_menu'
            }
          ]
        }
      }
    });
    console.log('✅ Event Preview Card Template Created. SID:', cardTemplate.sid);

    // 3. Payment Pending Template
    const paymentTemplate = await client.content.v1.contents.create({
      friendlyName: 'Eventa Payment Pending',
      language: 'en',
      variables: {
          '1': 'Event Name'
      },
      types: {
        'twilio/quick-reply': {
          body: '⏳ *Payment pending for {{1}}.*\n\nPlease approve the USSD prompt on your phone, then tap Check Status.\n\nTap Cancel to abort.',
          actions: [
            {
              type: 'QUICK_REPLY',
              title: 'Check Status',
              id: 'check_status'
            },
            {
              type: 'QUICK_REPLY',
              title: 'Cancel Checkout',
              id: 'cancel_checkout'
            }
          ]
        }
      }
    });
    console.log('✅ Payment Pending Template Created. SID:', paymentTemplate.sid);

    // 4. Ticket Tier Template (3 tiers + back)
    const ticketTierTemplate = await client.content.v1.contents.create({
      friendlyName: 'Eventa Ticket Tier Selection',
      language: 'en',
      variables: {
        '1': 'Event Title',
        '2': 'Tier 1 Name',
        '3': 'Tier 1 Price',
        '4': 'Tier 2 Name',
        '5': 'Tier 2 Price',
        '6': 'Tier 3 Name',
        '7': 'Tier 3 Price'
      },
      types: {
        'twilio/list-picker': {
          body: '🎟️ *{{1}}*\n\nPlease choose your ticket category from the menu below.',
          button: 'Select Ticket',
          items: [
            {
                item: '{{2}}',
                description: '{{3}}',
                id: 'tier_1'
            },
            {
                item: '{{4}}',
                description: '{{5}}',
                id: 'tier_2'
            },
            {
                item: '{{6}}',
                description: '{{7}}',
                id: 'tier_3'
            },
            {
                item: 'Back to Events',
                description: 'Browse other events',
                id: 'browse_events'
            }
          ]
        }
      }
    });
    console.log('✅ Ticket Tier Template Created. SID:', ticketTierTemplate.sid);

  } catch (error) {
    console.error('❌ Error creating templates:', error.message);
    if (error.details) {
      console.error(error.details);
    }
  }
}

createTemplates();
