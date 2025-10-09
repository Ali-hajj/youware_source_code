from __future__ import annotations

import sys
from datetime import datetime
from typing import Final

import requests

LICENSE_ENDPOINT: Final = "https://backend.youware.com/api/licenses/check"
TIMEOUT_SECONDS: Final = 5

class LicenseError(RuntimeError):
    """Raised when the license server rejects a serial."""


def verify_license(serial: str) -> bool:
    """Return True when the serial is valid and not expired."""
    serial = serial.strip()
    if not serial:
        raise LicenseError("serial is empty")

    try:
        response = requests.post(
            LICENSE_ENDPOINT,
            json={"serial": serial},
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise LicenseError(f"network error contacting license server: {exc}") from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise LicenseError("license server returned invalid JSON") from exc

    if not payload.get("valid"):
        reason = payload.get("reason") or payload.get("status") or "unknown reason"
        raise LicenseError(f"serial rejected: {reason}")

    expiry = payload.get("expiry")
    if not expiry:
        raise LicenseError("missing expiry in license response")

    try:
        expiry_date = datetime.strptime(expiry, "%Y-%m-%d")
    except ValueError as exc:
        raise LicenseError(f"invalid expiry format: {expiry}") from exc

    if datetime.utcnow() > expiry_date:
        raise LicenseError(f"serial expired on {expiry}")

    print(
        "[license] OK",
        f"serial={serial}",
        f"plan={payload.get('plan', 'n/a')}",
        f"user={payload.get('user', 'n/a')}",
        f"expires={expiry}",
    )
    return True


def main() -> None:
    serial = sys.argv[1] if len(sys.argv) > 1 else "ABC123-XYZ789"
    try:
        verify_license(serial)
    except LicenseError as exc:
        sys.exit(f"license verification failed: {exc}")


if __name__ == "__main__":
    main()
