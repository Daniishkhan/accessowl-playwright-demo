# Local Appsmith Target

Start the owned test target:

```bash
npm run appsmith:up
```

Then open `http://localhost:8080` and create an admin account. Add those test credentials to `.env`.

This compose file uses `index.docker.io/appsmith/appsmith-ce:latest` for a fast local MVP. Before publishing the project, pin the image to a release tag to avoid surprise upgrades.

The compose project and container name are `appsmith-access-agent`, so the existing `orr-*` containers are not modified.
