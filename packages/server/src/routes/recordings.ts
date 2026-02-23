import type { Hono } from 'hono';
import { saveRecordingSchema, replayRecordingSchema } from '@mcpspec/shared';
import type { Recording, RecordingDiff } from '@mcpspec/shared';
import { MCPClient, ProcessManagerImpl, RecordingReplayer, RecordingDiffer } from '@mcpspec/core';
import type { ServerConfig } from '@mcpspec/shared';
import type { Database } from '../db/database.js';

export function recordingsRoutes(app: Hono, db: Database): void {
  // List recordings
  app.get('/api/recordings', (c) => {
    const recordings = db.listRecordings();
    return c.json({ data: recordings, total: recordings.length });
  });

  // Get a recording
  app.get('/api/recordings/:id', (c) => {
    const recording = db.getRecording(c.req.param('id'));
    if (!recording) {
      return c.json({ error: 'not_found', message: 'Recording not found' }, 404);
    }
    return c.json({ data: recording });
  });

  // Save a recording
  app.post('/api/recordings', async (c) => {
    const body = await c.req.json();
    const parsed = saveRecordingSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }

    const recording = db.createRecording({
      name: parsed.data.name,
      description: parsed.data.description,
      serverName: parsed.data.serverName,
      data: parsed.data.data,
    });
    return c.json({ data: recording }, 201);
  });

  // Delete a recording
  app.delete('/api/recordings/:id', (c) => {
    const deleted = db.deleteRecording(c.req.param('id'));
    if (!deleted) {
      return c.json({ error: 'not_found', message: 'Recording not found' }, 404);
    }
    return c.json({ data: { deleted: true } });
  });

  // Replay a recording against a server
  app.post('/api/recordings/:id/replay', async (c) => {
    const saved = db.getRecording(c.req.param('id'));
    if (!saved) {
      return c.json({ error: 'not_found', message: 'Recording not found' }, 404);
    }

    const body = await c.req.json();
    const parsed = replayRecordingSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }

    const recording = JSON.parse(saved.data) as Recording;
    const processManager = new ProcessManagerImpl();
    const config: ServerConfig = {
      transport: parsed.data.transport,
      command: parsed.data.command,
      args: parsed.data.args,
      url: parsed.data.url,
      env: parsed.data.env,
    };

    const client = new MCPClient({ serverConfig: config, processManager });

    try {
      await client.connect();

      const replayer = new RecordingReplayer();
      const result = await replayer.replay(recording, client);

      const differ = new RecordingDiffer();
      const diff: RecordingDiff = differ.diff(recording, result.replayedSteps, result.replayedAt);

      await client.disconnect();
      await processManager.shutdownAll();

      return c.json({ data: diff });
    } catch (err) {
      await client.disconnect().catch(() => {});
      await processManager.shutdownAll().catch(() => {});
      const message = err instanceof Error ? err.message : 'Replay failed';
      return c.json({ error: 'replay_error', message }, 500);
    }
  });
}
