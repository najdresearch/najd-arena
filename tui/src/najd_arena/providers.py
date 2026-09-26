from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from typing import Any

from litellm import acompletion

from .models import ModelConfig


@dataclass(frozen=True)
class ModelResponse:
    model: str
    content: str
    tool_calls: list[dict[str, Any]]
    usage: dict[str, Any]


class LiteLLMProvider:
    def __init__(self, config: ModelConfig):
        self.config = config
        if config.api_key_env and not os.environ.get(config.api_key_env):
            raise ValueError(f"missing required environment variable: {config.api_key_env}")

    async def invoke(self, messages: list[dict[str, str]]) -> ModelResponse:
        kwargs: dict[str, Any] = {
            "model": self.config.model, "messages": messages,
            "temperature": self.config.temperature, "max_tokens": self.config.max_tokens,
            "timeout": self.config.timeout_seconds,
        }
        if self.config.api_base:
            kwargs["api_base"] = self.config.api_base
        if self.config.api_key_env:
            kwargs["api_key"] = os.environ[self.config.api_key_env]
        response = await acompletion(**kwargs)
        choice = response.choices[0].message
        calls = [{"name": call.function.name, "arguments": call.function.arguments}
                 for call in (choice.tool_calls or [])]
        usage = response.usage.model_dump() if response.usage else {}
        return ModelResponse(response.model or self.config.model, choice.content or "", calls, usage)


async def bounded_invoke(
    provider: LiteLLMProvider, messages: list[dict[str, str]], semaphore: asyncio.Semaphore
) -> ModelResponse:
    async with semaphore:
        return await provider.invoke(messages)
