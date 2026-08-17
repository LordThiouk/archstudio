/** Canonical protocol labels from docs/lego/PROTOCOLS.md — what we write on Link.protocol. */
export const PROTOCOL_LABELS: Record<string, string> = {
  rest: 'REST/HTTPS',
  grpc: 'gRPC',
  graphql: 'GraphQL',
  sql: 'SQL',
  nosql: 'Document API',
  redis: 'Redis',
  object: 'S3 API',
  queue: 'Message queue',
  kafka: 'Kafka',
  pubsub: 'Pub/Sub',
  webhook: 'Webhook',
  smtp: 'SMTP',
  oidc: 'OIDC/OAuth',
  cdc: 'CDC',
  batch: 'Batch transfer'
};

export function protocolLabel(protocolId: string): string {
  return PROTOCOL_LABELS[protocolId] || protocolId;
}

/** Default Link.protocol / kind for a callee brick (draw-edge + plate wiring). */
export function suggestedLinkForBrick(brick: string | undefined): { protocol: string; kind: 'sync' | 'async' | 'batch' } {
  switch (brick) {
    case 'identity': return { protocol: protocolLabel('oidc'), kind: 'sync' };
    case 'sql': return { protocol: protocolLabel('sql'), kind: 'sync' };
    case 'cache': return { protocol: protocolLabel('redis'), kind: 'sync' };
    case 'queue': return { protocol: protocolLabel('queue'), kind: 'async' };
    case 'pubsub': return { protocol: protocolLabel('pubsub'), kind: 'async' };
    case 'stream': return { protocol: protocolLabel('kafka'), kind: 'async' };
    case 'email': return { protocol: protocolLabel('smtp'), kind: 'async' };
    default: return { protocol: protocolLabel('rest'), kind: 'sync' };
  }
}
