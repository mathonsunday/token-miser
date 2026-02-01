export interface EventEnvelope {
  event_id: string;
  type: string;
  timestamp: number;
  sequence_number: number;
  data: unknown;
}
