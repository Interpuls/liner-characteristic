# Controlled Load Test

This repo includes a small controlled load-test script for:

- `POST /auth/login`
- compute-style endpoints such as `POST /setting-calculator/compare`

It is intentionally conservative by default:

- low concurrency
- small request count
- delay between requests

## Script

`ops/load_test_api.py`

## Login example

```bash
python ops/load_test_api.py login ^
  --url http://127.0.0.1:8080 ^
  --username user@example.com ^
  --password secret ^
  --requests 10 ^
  --concurrency 2 ^
  --delay-seconds 0.25
```

## Compute example

Use a valid bearer token and an existing payload file.

```bash
python ops/load_test_api.py compute ^
  --url http://127.0.0.1:8080 ^
  --path /setting-calculator/compare ^
  --payload-file ops/loadtest-setting-calculator-sample.json ^
  --bearer-token YOUR_TOKEN ^
  --requests 10 ^
  --concurrency 2 ^
  --delay-seconds 0.5
```

## Notes

- The sample payload assumes `productApplicationId=1`; adjust it to your data.
- The login test can trigger existing brute-force or rate-limit protections if you push it too hard.
- For production-like checks, keep request counts low and run in a controlled window.
