export const RECOMMENDED_RESPONSE = {
  Critical: {
    urgency: 'Immediate',
    action: 'Isolate the affected host and block the source IP. Escalate to the SOC lead now.',
  },
  High: {
    urgency: 'Urgent',
    action: 'Flag for analyst review within the hour. Restrict outbound access from the source pending review.',
  },
  Medium: {
    urgency: 'Routine',
    action: 'Log the flow for correlation with related alerts. Monitor the source for recurrence.',
  },
  Low: {
    urgency: 'Informational',
    action: 'No action required. Continue routine monitoring.',
  },
};
