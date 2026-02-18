# Troubleshooting

## Connection Timeout

If you see "Connection Timed Out":
- Verify the server command is correct
- Check the server is installed (`npx your-server --help`)
- Increase timeout with collection settings

## YAML Parse Error

- Ensure valid YAML syntax
- Check UTF-8 encoding
- Maximum file size: 1MB

## Process Cleanup

MCPSpec automatically cleans up spawned processes on exit. If you see orphaned processes, please report it as a bug.
