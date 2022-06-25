function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  postmarkApiToken:
    process.env.POSTMARK_API_TOKEN || configMissing('POSTMARK_API_TOKEN'),
  titoCheckinSlug:
    process.env.TITO_CHECKIN_SLUG || configMissing('TITO_CHECKIN_SLUG'),
  defaultProfileImage:
    'https://images.that.tech/members/person-placeholder.jpg',
  activeCampaign: {
    api:
      process.env.ACTIVE_CAMPAIGN_API || configMissing('ACTIVE_CAMPAIGN_API'),
    key:
      process.env.ACTIVE_CAMPAIGN_KEY || configMissing('ACTIVE_CAMPAIGN_KEY'),
    RegisteredFromField: '20',
    newsLetterName: 'THAT Newsletter',
  },
  slack: {
    webhookUrl:
      process.env.SLACK_WEBHOOK_URL || configMissing('SLACK_WEBHOOK_URL'),
    inviteUrl:
      process.env.SLACK_INVITE_URL ||
      'https://slack.com/api/users.admin.invite',
    legacyToken:
      process.env.SLACK_LEGACY_TOKEN || configMissing('SLACK_LEGACY_TOKEN'),
    memberNotificationChannel: '#introductions',
  },
});

export default requiredConfig();
