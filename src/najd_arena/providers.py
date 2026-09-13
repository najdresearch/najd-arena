from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Protocol

from .canonical import read_json
from .models import Case, ProviderConfig


class Provider(Protocol):
    def validate(self) -> None: ...

    def invoke(self, case: Case, *, temperature: float, max_tokens: int) -> dict[str, Any]: ...


class RecordedProvider:
    def __init__(self, config: ProviderConfig, project_root: Path):
        if not config.responses_file:
            raise ValueError("recorded provider requires responses_file")
        path = (project_root / config.responses_file).resolve()
        self.responses = read_json(path)

    def validate(self) -> None:
        if not isinstance(self.responses, dict):
            raise TypeError("recorded responses must be an object keyed by case id")

    def invoke(self, case: Case, *, temperature: float, max_tokens: int) -> dict[str, Any]:
        del temperature, max_tokens
        if case.id not in self.responses:
            raise KeyError(f"recorded response missing for {case.id}")
        return {"model": "recorded-v1", "output": self.responses[case.id], "usage": {}}


class OpenAICompatibleProvider:
    def __init__(self, config: ProviderConfig):
        if not config.base_url or not config.api_key_env:
            raise ValueError("openai-compatible provider requires base_url and api_key_env")
        self.base_url = config.base_url.rstrip("/")
        self.model = config.model
        self.api_key_env = config.api_key_env

    def validate(self) -> None:
        if not os.environ.get(self.api_key_env):
            raise ValueError(f"required secret environment variable is missing: {self.api_key_env}")

    def invoke(self, case: Case, *, temperature: float, max_tokens: int) -> dict[str, Any]:
        messages = case.input.get("messages")
        if not isinstance(messages, list):
            messages = [{"role": "user", "content": str(case.input.get("prompt", ""))}]
        body = json.dumps(
            {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
        ).encode()
        request = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=body,
            headers={
                "Authorization": f"Bearer {os.environ[self.api_key_env]}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.load(response)
        except urllib.error.URLError as error:
            raise RuntimeError(f"provider request failed: {error.reason}") from error
        message = payload["choices"][0]["message"]
        return {
            "model": payload.get("model", self.model),
            "output": message.get("content", ""),
            "usage": payload.get("usage", {}),
        }


def build_provider(config: ProviderConfig, project_root: Path) -> Provider:
    if config.plugin == "recorded":
        provider: Provider = RecordedProvider(config, project_root)
    else:
        provider = OpenAICompatibleProvider(config)
    provider.validate()
    return provider
