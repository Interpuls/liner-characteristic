# Fail2ban for Login Brute Force

This project already records failed login attempts in the application database and enforces app-level rate limits.
These files add a host-level `fail2ban` option based on backend log lines.

## Backend log signature

Failed login attempts now emit lines like:

```text
FAIL2BAN_AUTH event=login_failure reason=invalid_credentials ip=203.0.113.10 email=user@example.com user_id=- attempts=3 threshold=-
```

`fail2ban` can match on the `ip=` field and ban the source address at host level.

## Files

- Filter: `ops/fail2ban/filter.d/liner-auth.conf`
- Jail example: `ops/fail2ban/jail.d/liner-auth.local.example`

## Recommended server setup

If the backend runs in Docker, make sure backend logs are available on the host in a plain text file.
One simple option is to redirect container logs into a file that fail2ban can read:

```bash
mkdir -p /var/log/liner
docker logs -f liner-backend >> /var/log/liner/backend-auth.log 2>&1
```

A more robust option is to use Docker's `journald` log driver and point fail2ban to journald.

## Install

Copy these files on the server:

```bash
sudo cp /opt/liner/ops/fail2ban/filter.d/liner-auth.conf /etc/fail2ban/filter.d/liner-auth.conf
sudo cp /opt/liner/ops/fail2ban/jail.d/liner-auth.local.example /etc/fail2ban/jail.d/liner-auth.local
```

Then reload fail2ban:

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status liner-auth
```

## Notes

- `maxretry` in fail2ban should usually be aligned with or lower than the app-level login threshold.
- The backend currently defaults to `10` failed attempts per email and `20` per IP in a `10` minute window.
