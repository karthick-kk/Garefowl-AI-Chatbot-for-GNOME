# SearXNG Local Instance Setup

This directory contains configuration files to run a local SearXNG instance for Garefowl AI Chatbot.

## Quick Start

1. Install Docker and Docker Compose
2. Navigate to this directory:
   ```bash
   cd searxng/
   ```

3. Generate a secret key:
   ```bash
   sed -i "s/change-this-secret-key-to-a-random-string/$(openssl rand -hex 32)/" settings.yml
   ```

4. Start SearXNG:
   ```bash
   docker-compose up -d
   ```

5. Verify it's working:
   ```bash
   curl "http://localhost:8080/search?q=test&format=json"
   ```

6. Configure Garefowl extension:
   - Open extension preferences
   - Set SearXNG Instance URL to: `http://localhost:8080`
   - Enable Web Search
   - Save

## Stop/Restart

```bash
docker-compose stop    # Stop
docker-compose start   # Start
docker-compose restart # Restart
docker-compose down    # Stop and remove containers
```

## Configuration

- `docker-compose.yaml` - Docker services configuration
- `settings.yml` - SearXNG main settings (JSON format enabled, limiter disabled)
- `limiter.toml` - Bot detection settings (localhost allowed)

## Troubleshooting

If you get HTTP 403 errors:
1. Check settings.yml has `limiter: false`
2. Verify limiter.toml allows localhost IPs
3. Restart: `docker-compose restart`
4. Check logs: `docker logs garefowl-searxng`
