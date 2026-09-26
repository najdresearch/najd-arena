from __future__ import annotations

import base64
import ipaddress
import os
import socket
from dataclasses import dataclass
from urllib.parse import urlparse

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def validate_public_endpoint(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("hosted endpoints must be public HTTPS URLs without embedded credentials")
    if parsed.port not in (None, 443):
        raise ValueError("hosted endpoints must use the standard HTTPS port")
    for info in socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM):
        address = ipaddress.ip_address(info[4][0])
        if not address.is_global:
            raise ValueError("endpoint resolves to a non-public network address")
    return value.rstrip("/")


@dataclass(frozen=True)
class EncryptedSecret:
    ciphertext: str
    nonce: str
    auth_tag: str
    key_id: str


class CredentialCipher:
    def __init__(self, key: bytes, key_id: str = "v1"):
        if len(key) != 32:
            raise ValueError("credential encryption key must contain exactly 32 bytes")
        self._cipher = AESGCM(key)
        self.key_id = key_id

    @classmethod
    def from_environment(cls) -> CredentialCipher:
        encoded = os.environ["ARENA_CREDENTIAL_KEY"]
        return cls(base64.urlsafe_b64decode(encoded), os.getenv("ARENA_CREDENTIAL_KEY_ID", "v1"))

    def encrypt(self, value: str, *, run_id: str, organization_id: str) -> EncryptedSecret:
        nonce = os.urandom(12)
        aad = f"{organization_id}:{run_id}".encode()
        encrypted = self._cipher.encrypt(nonce, value.encode(), aad)
        return EncryptedSecret(base64.urlsafe_b64encode(encrypted).decode(),
                               base64.urlsafe_b64encode(nonce).decode(), "", self.key_id)

    def decrypt(self, value: EncryptedSecret, *, run_id: str, organization_id: str) -> str:
        aad = f"{organization_id}:{run_id}".encode()
        ciphertext = base64.urlsafe_b64decode(value.ciphertext)
        if value.auth_tag:
            ciphertext += base64.urlsafe_b64decode(value.auth_tag)
        return self._cipher.decrypt(base64.urlsafe_b64decode(value.nonce), ciphertext, aad).decode()
