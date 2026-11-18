# Lightsail production deployment

Production uses the 2 GB Ubuntu Lightsail instance in `ap-south-1`. GitHub Actions builds both images and publishes private commit-tagged packages to GHCR. The instance only pulls images. Keep the existing EC2 instance available for 24 hours after cutover.

## One-time AWS and external setup

1. Create a dual-stack Ubuntu Lightsail instance (2 GB RAM, 2 vCPU, 60 GB SSD) in Mumbai and attach a static IPv4 address. Open TCP 80/443 publicly; restrict TCP 22 to administrator IPs. Enable automatic instance snapshots.
2. Add that static IPv4 address to MongoDB Atlas network access. Use a dedicated database user and a production `MONGODB_URI`. Grant the S3 key only `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` for the quotation bucket objects. The API also needs the bucket name and `ap-south-1` region.
3. Lower the DNS TTL of `configurator.orion-led.com` to 300 seconds in advance of the cutover. Prepare GitHub repository secrets `LIGHTSAIL_HOST` (static IP), `LIGHTSAIL_USER` (usually `ubuntu`), and `LIGHTSAIL_SSH_KEY` (private key). Add the corresponding public key to the instance.
4. Make the GHCR packages private and grant the repository workflow permission to publish them. Create a classic GitHub personal access token with only `read:packages` and access to those two packages for the instance.

## Bootstrap the instance

Run the following over SSH as the instance administrator. Install Docker Engine and its Compose plugin from Docker's official Ubuntu repository, plus `certbot` from Ubuntu packages. Ensure the administrator can run `sudo docker`, and install `curl`. See [Docker's Ubuntu installation guide](https://docs.docker.com/engine/install/ubuntu/).

```bash
sudo apt update
sudo apt install -y certbot curl
sudo install -d -m 755 /opt/configurator/app /var/www/certbot
sudo install -d -m 700 /opt/configurator/config
sudo chown "$USER:$USER" /opt/configurator/app
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-configurator-swap.conf
sudo sysctl --system
```

Write `/opt/configurator/config/backend.env` with mode `600`, owned by root. The values are read at container startup and are never copied by CI:

```env
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
FRONTEND_URL=https://configurator.orion-led.com
RUN_PARTNER_SCRIPT=false
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET_NAME=...
S3_REGION=ap-south-1
RESEND_API_KEY=...
TO_EMAIL=...
DEFAULT_FROM_EMAIL=...
```

Log Docker in as **root**, because the deployment script runs `sudo docker`. Pass the GHCR token through standard input and avoid putting it in shell history:

```bash
sudo docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Paste the read-only token when prompted on standard input, then press Ctrl-D. The username must have read access to both private packages. Protect `/root/.docker/config.json` and rotate the token periodically.

## First deployment, private verification, and DNS cutover

Keep the public A and AAAA records on EC2 while preparing and testing Lightsail. The frontend image expects a real certificate at startup, so obtain it with a DNS challenge that does not change where web traffic is sent:

1. On Lightsail, run `sudo certbot certonly --manual --preferred-challenges dns --cert-name configurator.orion-led.com -d configurator.orion-led.com --agree-tos -m YOUR_ADMIN_EMAIL --no-eff-email`. Certbot displays a TXT value for `_acme-challenge.configurator.orion-led.com`. Add only that TXT record at the current DNS provider, wait until it resolves publicly, then continue Certbot. Leave the A and AAAA records unchanged. Remove the temporary TXT record after issuance.
2. With the Lightsail server, runtime environment, GHCR login, and GitHub secrets ready, push the deployment commit to `main`. The workflow builds and publishes both images, copies the production Compose files, pulls the images on Lightsail, starts the stack, and validates HTTPS `/health` locally on Lightsail.
3. On the administrator's computer, temporarily add `LIGHTSAIL_STATIC_IP configurator.orion-led.com` to the local hosts file. Flush the local DNS cache and open the production URL. Only that computer reaches Lightsail; normal users continue reaching EC2.
4. Verify the SPA and deep-link refresh, login, MongoDB reads and writes, quotation create/edit, S3 PDF upload/view/download, and email delivery. Check `sudo docker ps`, `sudo docker stats --no-stream`, and container logs on Lightsail. Remove the hosts-file override and flush the local DNS cache after testing.
5. Lower the public DNS TTL to 300 seconds and wait for the previous TTL to expire. Change the A record to the Lightsail static IPv4 address. Update the AAAA record to the Lightsail IPv6 address or remove it; do not leave an AAAA record pointing to EC2. Keep EC2 running and unchanged while caches expire.
6. Confirm public resolvers and a device without the hosts override reach Lightsail. Monitor HTTPS `/health`, authentication, container restarts, memory, swap, MongoDB, and S3. Because both servers use the external MongoDB and S3 stores, EC2 remains a usable DNS rollback target during propagation.
7. After public DNS resolves to Lightsail, switch Certbot renewal to webroot with `sudo certbot reconfigure --cert-name configurator.orion-led.com --webroot -w /var/www/certbot`. This validates and saves the renewal method ([Certbot guide](https://eff-certbot.readthedocs.io/en/stable/using.html#modifying-the-renewal-configuration-of-existing-certificates)). The deploy script installs a renewal hook that reloads Nginx. Confirm `sudo certbot renew --dry-run` succeeds.
8. Keep EC2 running for at least 24 hours after cutover. If Lightsail fails, restore the old A and AAAA records and investigate while EC2 serves traffic. After the observation period, snapshot EC2, stop it first, and terminate it only after the chosen recovery window has passed. Restore the normal DNS TTL afterward.

The old EC2 production workflow is replaced by this main-only workflow. Development remains on Netlify and Render. Merge this deployment change back into `develop` when convenient; its GitHub Actions trigger only matches `main`.

## Release behavior and capacity

The deploy script pulls before changing the running stack. It records the SHA in `/opt/configurator/config/current-release` only after container health and HTTPS checks pass. If a new release fails after activation, it starts the previously recorded SHA. On the first release there is no prior version to restore. A failed pull leaves the running stack untouched. Successful releases prune unused Docker images older than 14 days; the current image is never pruned.

The backend has a 1 GB container limit and a 640 MB Node heap cap. Nginx has a 192 MB limit. Keep an eye on memory, swap activity, disk space, restarts, and MongoDB connections during representative use by 5–15 active users. Upgrade to 4 GB if memory pressure or repeated restarts occur. The swap file protects against short spikes and is not needed for builds.
