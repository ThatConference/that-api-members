function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  postmarkApiToken:
    process.env.POSTMARK_API_TOKEN || configMissing('POSTMARK_API_TOKEN'),
  titoCheckinSlug:
    process.env.TITO_CHECKIN_SLUG || configMissing('TITO_CHECKIN_SLUG'),
  slackWebhookUrl:
    process.env.SLACK_WEBHOOK_URL || configMissing('SLACK_WEBHOOK_URL'),
  memberNotifSlackChannel: '#introductions',
  defaultProfileImage:
    'https://images.that.tech/members/person-placeholder.jpg',
});

export default requiredConfig();
