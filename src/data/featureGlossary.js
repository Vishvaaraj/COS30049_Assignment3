export const FEATURE_GLOSSARY = [
  {
    key: 'duration',
    label: 'Duration',
    summary: 'How long the connection lasted, in seconds — longer sessions can indicate persistent probing or data exfiltration.',
  },
  {
    key: 'protocol_type',
    label: 'Protocol type',
    summary: 'Transport protocol (tcp, udp, icmp) — attack patterns often cluster by protocol.',
  },
  {
    key: 'service',
    label: 'Service',
    summary: 'Destination network service (e.g. http, ftp_data) — reveals which port/service the flow targeted.',
  },
  {
    key: 'flag',
    label: 'Connection flag',
    summary: 'TCP connection state at end of capture (e.g. SF = normal finish) — abnormal flag sequences can signal scans or half-open attacks.',
  },
  {
    key: 'src_bytes',
    label: 'Source bytes',
    summary: 'Bytes sent from source to destination — unusually large uploads may indicate data theft.',
  },
  {
    key: 'dst_bytes',
    label: 'Destination bytes',
    summary: 'Bytes sent from destination back to source — spikes can reflect denial-of-service responses.',
  },
  {
    key: 'count',
    label: 'Count',
    summary: 'Number of connections to the same destination host in the past two seconds — high counts suggest port scanning.',
  },
  {
    key: 'srv_count',
    label: 'Srv count',
    summary: 'Connections to the same service on the destination in the past two seconds — repeated hits on one service often mean probing.',
  },
  {
    key: 'serror_rate',
    label: 'SYN error rate',
    summary: 'Fraction of connections that had SYN errors — elevated rates are a common sign of stealth or flood attacks.',
  },
];
