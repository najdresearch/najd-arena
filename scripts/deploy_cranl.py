"""Deploy through CranL's documented API after CI, then check HTTPS health."""
import json
import os
import time
import urllib.request

APP = "03654404-e4e0-4526-8d4f-9432faf62c42"
BASE = f"https://app.cranl.com/api/applications/{APP}"


def api(path, method="GET"):
    request = urllib.request.Request(
        BASE + path,
        data=b"{}" if method == "POST" else None,
        method=method,
        headers={"Authorization": f"Bearer {os.environ['CRANL_API_KEY']}",
                 "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def main():
    before = {row["deploymentId"] for row in api("/deployments")["deployments"]}
    api("/deploy", "POST")
    print("CranL deployment requested")
    deadline = time.monotonic() + 900
    while time.monotonic() < deadline:
        rows = [row for row in api("/deployments")["deployments"]
                if row["deploymentId"] not in before]
        if rows:
            deployment = rows[0]
            if deployment["status"] == "error":
                raise RuntimeError("CranL build failed; inspect deployment logs")
            if deployment["status"] == "done":
                break
        time.sleep(10)
    else:
        raise TimeoutError("CranL did not complete within 15 minutes")
    # The platform can finish the build shortly before Next.js starts listening.
    for _ in range(18):
        try:
            with urllib.request.urlopen("https://najdarena.com/api/health", timeout=15) as response:
                if response.status == 200 and json.load(response).get("status") == "ok":
                    print("Deployment complete; HTTPS and database health passed")
                    return
        except (OSError, ValueError):
            pass
        time.sleep(10)
    raise RuntimeError("Deployment completed but database health did not recover")


if __name__ == "__main__":
    main()
