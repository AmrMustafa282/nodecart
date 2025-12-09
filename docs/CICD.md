# CI/CD Pipeline

## Overview

Simple CI pipeline using GitHub Actions that validates Docker builds on every push and pull request.

## Pipeline

The CI pipeline runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### What It Does

1. **Checkout Code** - Gets the latest code
2. **Build Docker Images** - Builds all 7 service images
3. **Validate Configuration** - Checks Docker Compose config

**Duration**: ~5-10 minutes depending on GitHub Actions cache

## Testing Locally

Before pushing to GitHub, test the CI pipeline locally:

```bash
./scripts/test-ci.sh
```

This script does exactly what GitHub Actions will do:
- Validates Docker Compose configuration
- Builds all Docker images
- Reports any build failures

## Workflow File

The workflow is defined in `.github/workflows/ci.yml`

## Setup

### Prerequisites

1. **GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/NodeCart.git
   git push -u origin main
   ```

2. **GitHub Actions**
   - Automatically enabled when you push
   - No secrets required for basic CI
   - Uses GitHub's runners (free for public repos)

### Optional: Docker Hub Deployment

To push images to Docker Hub on successful builds, add these secrets:

Repository Settings → Secrets and variables → Actions:
- `DOCKER_USERNAME` - Your Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub access token

Then update `.github/workflows/ci.yml` to add push steps.

## Workflow Steps

```yaml
1. Checkout code
2. Setup Docker Buildx
3. Build auth-service
4. Build user-service
5. Build product-service
6. Build order-service
7. Build payment-service
8. Build notification-service
9. Build api-gateway
10. Validate docker-compose.yml
```

## Status Badge

Add to README:

```markdown
![CI](https://github.com/yourusername/NodeCart/workflows/CI%20Pipeline/badge.svg)
```

## Troubleshooting

### Build Fails Locally But Works in CI
- Check Docker version
- Clear Docker build cache: `docker system prune -a`
- Ensure all files are committed

### Build Fails in CI But Works Locally
- Check GitHub Actions logs
- Verify all files are in git
- Check .gitignore isn't excluding needed files

### Slow Builds
- GitHub Actions caches Docker layers
- First build is slow (~10 min)
- Subsequent builds are faster (~3-5 min)

## Best Practices

1. **Always test locally first**
   ```bash
   ./scripts/test-ci.sh
   ```

2. **Keep builds fast**
   - Only essential checks
   - Use Docker layer caching
   - Parallel builds where possible

3. **Commit frequently**
   - Small, focused commits
   - Clear commit messages
   - Test before pushing

4. **Monitor builds**
   - Check Actions tab on GitHub
   - Fix failures promptly
   - Keep main branch green

## Extending the Pipeline

To add more checks:

1. **Linting**
   ```yaml
   - name: Run ESLint
     run: |
       cd shared && npm ci && npm run lint
   ```

2. **Unit Tests**
   ```yaml
   - name: Test Shared Library
     run: |
       cd shared && npm ci && npm test
   ```

3. **Security Scanning**
   ```yaml
   - name: Run Trivy
     uses: aquasecurity/trivy-action@master
     with:
       image-ref: nodecart-auth-service:test
   ```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [Docker Compose in CI](https://docs.docker.com/compose/ci/)
