#!/usr/bin/env python3
import argparse
import json
import statistics
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed


DEFAULT_HEADERS = {
    "User-Agent": "liner-controlled-loadtest/1.0",
}


def percentile(sorted_values, ratio):
    if not sorted_values:
        return 0.0
    index = int(round((len(sorted_values) - 1) * ratio))
    index = max(0, min(index, len(sorted_values) - 1))
    return sorted_values[index]


def build_request(url, *, method="GET", headers=None, body=None):
    req_headers = dict(DEFAULT_HEADERS)
    if headers:
        req_headers.update(headers)
    return urllib.request.Request(url, data=body, headers=req_headers, method=method)


def do_request(url, *, method="GET", headers=None, body=None, timeout=30):
    started = time.perf_counter()
    try:
        request = build_request(url, method=method, headers=headers, body=body)
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = response.read()
            duration_ms = (time.perf_counter() - started) * 1000
            return {
                "ok": True,
                "status": response.status,
                "duration_ms": duration_ms,
                "body": payload.decode("utf-8", errors="replace"),
            }
    except urllib.error.HTTPError as exc:
        duration_ms = (time.perf_counter() - started) * 1000
        body_text = exc.read().decode("utf-8", errors="replace")
        return {
            "ok": False,
            "status": exc.code,
            "duration_ms": duration_ms,
            "body": body_text,
        }
    except Exception as exc:
        duration_ms = (time.perf_counter() - started) * 1000
        return {
            "ok": False,
            "status": "EXC",
            "duration_ms": duration_ms,
            "body": str(exc),
        }


class ControlledLoadRunner:
    def __init__(self, *, total_requests, concurrency, delay_seconds):
        self.total_requests = total_requests
        self.concurrency = concurrency
        self.delay_seconds = delay_seconds
        self._lock = threading.Lock()
        self._next_index = 0

    def _next_job(self):
        with self._lock:
            if self._next_index >= self.total_requests:
                return None
            current = self._next_index
            self._next_index += 1
            return current

    def run(self, fn):
        results = []

        def worker():
            local_results = []
            while True:
                idx = self._next_job()
                if idx is None:
                    return local_results
                local_results.append(fn(idx))
                if self.delay_seconds > 0:
                    time.sleep(self.delay_seconds)

        with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
            futures = [executor.submit(worker) for _ in range(self.concurrency)]
            for future in as_completed(futures):
                results.extend(future.result())
        return results


def summarize_results(label, results):
    if not results:
        print(f"{label}: no results")
        return 1

    durations = sorted(r["duration_ms"] for r in results)
    by_status = {}
    failures = []
    for item in results:
        key = str(item["status"])
        by_status[key] = by_status.get(key, 0) + 1
        if not item["ok"] or (isinstance(item["status"], int) and item["status"] >= 400):
            failures.append(item)

    print(f"{label}:")
    print(f"  total_requests: {len(results)}")
    print(f"  status_counts: {json.dumps(by_status, ensure_ascii=True, sort_keys=True)}")
    print(f"  avg_ms: {statistics.mean(durations):.2f}")
    print(f"  p50_ms: {percentile(durations, 0.50):.2f}")
    print(f"  p95_ms: {percentile(durations, 0.95):.2f}")
    print(f"  max_ms: {max(durations):.2f}")

    if failures:
        print("  sample_failures:")
        for item in failures[:5]:
            snippet = (item["body"] or "").strip().replace("\n", " ")
            print(f"    - status={item['status']} dur_ms={item['duration_ms']:.2f} body={snippet[:180]}")
        return 1
    return 0


def login_mode(args):
    body = urllib.parse.urlencode(
        {"username": args.username, "password": args.password}
    ).encode("utf-8")

    def hit(_index):
        return do_request(
            args.url.rstrip("/") + "/auth/login",
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            body=body,
            timeout=args.timeout_seconds,
        )

    runner = ControlledLoadRunner(
        total_requests=args.requests,
        concurrency=args.concurrency,
        delay_seconds=args.delay_seconds,
    )
    return summarize_results("login_load_test", runner.run(hit))


def compute_mode(args):
    with open(args.payload_file, "r", encoding="utf-8") as fh:
        payload = json.load(fh)
    body = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if args.bearer_token:
        headers["Authorization"] = f"Bearer {args.bearer_token}"

    def hit(_index):
        return do_request(
            args.url.rstrip("/") + args.path,
            method=args.method.upper(),
            headers=headers,
            body=body,
            timeout=args.timeout_seconds,
        )

    runner = ControlledLoadRunner(
        total_requests=args.requests,
        concurrency=args.concurrency,
        delay_seconds=args.delay_seconds,
    )
    return summarize_results("compute_load_test", runner.run(hit))


def main():
    parser = argparse.ArgumentParser(
        description="Controlled load test for login and compute endpoints."
    )
    subparsers = parser.add_subparsers(dest="mode", required=True)

    login = subparsers.add_parser("login", help="Run controlled load against /auth/login")
    login.add_argument("--url", required=True, help="Base API URL, e.g. http://127.0.0.1:8080")
    login.add_argument("--username", required=True)
    login.add_argument("--password", required=True)
    login.add_argument("--requests", type=int, default=10)
    login.add_argument("--concurrency", type=int, default=2)
    login.add_argument("--delay-seconds", type=float, default=0.25)
    login.add_argument("--timeout-seconds", type=float, default=15)
    login.set_defaults(func=login_mode)

    compute = subparsers.add_parser("compute", help="Run controlled load against a compute endpoint")
    compute.add_argument("--url", required=True, help="Base API URL, e.g. http://127.0.0.1:8080")
    compute.add_argument(
        "--path",
        default="/setting-calculator/compare",
        help="Endpoint path, default /setting-calculator/compare",
    )
    compute.add_argument("--payload-file", required=True, help="JSON payload file")
    compute.add_argument("--bearer-token", required=True, help="Bearer token for authenticated endpoint")
    compute.add_argument("--method", default="POST")
    compute.add_argument("--requests", type=int, default=10)
    compute.add_argument("--concurrency", type=int, default=2)
    compute.add_argument("--delay-seconds", type=float, default=0.5)
    compute.add_argument("--timeout-seconds", type=float, default=30)
    compute.set_defaults(func=compute_mode)

    args = parser.parse_args()
    sys.exit(args.func(args))


if __name__ == "__main__":
    main()
