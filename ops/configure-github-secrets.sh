#!/usr/bin/env bash
# Ejecutar una vez desde el VPS, tras autenticar gh como lucianomarchese.
set -euo pipefail

repo='lucianomarchese/pos'
credentials='/srv/stacks/factories/astro/.github-actions.env'
deploy_key='/home/athaleo/.ssh/github-actions-deploy'

gh auth status >/dev/null
test -r "$credentials"
test -r "$deploy_key"

# Archivo local del VPS; nunca copiarlo al repositorio.
# shellcheck source=/dev/null
source "$credentials"
test -n "${TS_OAUTH_CLIENT_ID:-}"
test -n "${TS_OAUTH_SECRET:-}"

vps_host="$(tailscale ip -4 | head -n 1)"
test -n "$vps_host"

gh secret set DEPLOY_KEY --repo "$repo" < "$deploy_key"
printf 'athaleo' | gh secret set VPS_USER --repo "$repo"
printf '%s' "$vps_host" | gh secret set VPS_HOST --repo "$repo"
ssh-keyscan -p 2288 -H "$vps_host" 2>/dev/null | gh secret set VPS_KNOWN_HOSTS --repo "$repo"
printf '%s' "$TS_OAUTH_CLIENT_ID" | gh secret set TS_OAUTH_CLIENT_ID --repo "$repo"
printf '%s' "$TS_OAUTH_SECRET" | gh secret set TS_OAUTH_SECRET --repo "$repo"

echo "Se configuraron los seis secretos de despliegue en $repo."
