/**
 * This file demonstrates patterns that should be caught by custom source/sink
 * declarations and natural language rules configured in ZeroPath.
 */

import { Request, Response } from 'express';
import * as yaml from 'js-yaml';

// === Custom Source: Event handler receiving untrusted payloads ===
// This matches the "E2E Test Source" custom source declaration:
// "Functions decorated with @event_handler receive untrusted event payloads"

interface EventPayload {
  action: string;
  data: Record<string, unknown>;
}

function eventHandler(payload: EventPayload) {
  // Process untrusted event data
  const userInput = payload.data.query as string;
  
  // This flows to a raw SQL sink
  const query = `SELECT * FROM events WHERE action = '${userInput}'`;
  return query;
}

// === Custom Sink: Raw SQL execution without parameterization ===
// This matches the "E2E Test Sink" custom sink declaration:
// "The method execute_raw_sql on class DatabaseClient executes raw SQL queries"

class DatabaseClient {
  private connection: any;
  
  execute_raw_sql(query: string): Promise<any> {
    // Executes raw SQL without parameterization - this is a SQL injection sink
    return this.connection.query(query);
  }
}

// === Sink Pack: Unsafe YAML loading ===
// This matches the "Unsafe YAML Loading" template from the Serialization sink pack

function loadConfig(configData: string) {
  // yaml.load without SafeLoader is an RCE sink
  const config = yaml.load(configData);
  return config;
}

// === Sink Pack: Pickle-like deserialization ===
// Matches "Python Pickle Deserialization" template

function deserializeData(serializedInput: string) {
  // Unsafe deserialization of user-controlled data
  const obj = JSON.parse(serializedInput);
  // In a real scenario this would be eval() or similar
  return eval(obj.code);
}

// === NL Rule: File upload without validation ===
// This matches the "E2E Test Rule" NL rule:
// "Flag any endpoint that accepts file uploads without validating the file type or size"

function handleFileUpload(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded');
  }
  
  // No file type validation!
  // No file size validation!
  // Directly saving the uploaded file
  const fs = require('fs');
  fs.writeFileSync(`/uploads/${file.originalname}`, file.buffer);
  
  return res.status(200).send('File uploaded successfully');
}

// === Source Pack: Kafka consumer handler ===
// Matches "Kafka Consumer Handler" from Message Queue Consumers pack

interface KafkaMessage {
  key: string;
  value: string;
  headers: Record<string, string>;
}

function kafkaConsumerHandler(message: KafkaMessage) {
  // Untrusted data from Kafka topic
  const userData = JSON.parse(message.value);
  
  // Flows to raw SQL sink
  const db = new DatabaseClient();
  db.execute_raw_sql(`INSERT INTO events (data) VALUES ('${userData.name}')`);
}

// === Wire it all together ===
export function processEvent(req: Request, res: Response) {
  const payload = req.body as EventPayload;
  const result = eventHandler(payload);
  
  const db = new DatabaseClient();
  db.execute_raw_sql(result);
  
  const config = loadConfig(req.body.config);
  
  return res.json({ result, config });
}
