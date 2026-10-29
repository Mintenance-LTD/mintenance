"""CPU regression tests for the recovered production proxy and startup contract."""
import importlib.util
import json
import os
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

import httpx
from fastapi.testclient import TestClient

SPEC = importlib.util.spec_from_file_location("mint_modal_serve", Path(__file__).with_name("modal_serve.py"))
serve = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(serve)


class ServingTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {"MINT_AI_API_KEY": "regression-only-key"})
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.requests = []
        self.upstreams = []
        self.clients = []
        self.network_error = None
        self.response_status = 200
        self.response_content = b'{"choices":[{"message":{"content":"ok"}}]}'
        self.response_type = "application/json"
        original_client = httpx.AsyncClient

        def respond(request):
            if self.network_error:
                raise self.network_error
            self.requests.append(request)
            response = httpx.Response(self.response_status, content=self.response_content,
                                      headers={"content-type": self.response_type})
            self.upstreams.append(response)
            return response

        def make_client(**kwargs):
            client = original_client(transport=httpx.MockTransport(respond), **kwargs)
            self.clients.append(client)
            return client

        self.mock_client = patch("httpx.AsyncClient", side_effect=make_client)
        self.mock_client.start()
        self.addCleanup(self.mock_client.stop)
        self.client = TestClient(serve.create_web_app(serve.DEFAULT_ADAPTER_NAME))
        self.addCleanup(self.client.close)
        self.auth = {"Authorization": "Bearer regression-only-key"}

    def test_missing_secret_fails_closed(self):
        with patch.dict(os.environ, {"MINT_AI_API_KEY": " "}):
            with self.assertRaisesRegex(RuntimeError, "must be configured"):
                serve.create_web_app("test")

    def test_health_preserves_adapter(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["adapter"], "mint-ai-vlm-v2")
        self.assertEqual(self.requests, [])

    def test_missing_and_invalid_auth_do_not_reach_upstream(self):
        for value in ("", "Bearer wrong", "Bearer \u00e9"):
            # HTTP header encodings permit latin-1; use bytes for this edge case.
            response = self.client.get("/v1/models", headers={b"authorization": value.encode("utf-8")})
            self.assertEqual(response.status_code, 401)
        self.assertEqual(self.requests, [])

    def test_bearer_and_legacy_bare_keys(self):
        for value in ("Bearer regression-only-key", "bearer regression-only-key", "regression-only-key"):
            self.assertEqual(self.client.get("/v1/models", headers={"Authorization": value}).status_code, 200)

    def test_completion_targets_adapter_and_preserves_image(self):
        payload = {"model": "old-web-name", "messages": [{"role": "user", "content": "image"}]}
        response = self.client.post("/v1/chat/completions", json=payload, headers=self.auth)
        self.assertEqual(response.status_code, 200)
        sent = json.loads(self.requests[0].content)
        self.assertEqual(sent["model"], "mint-ai-served")
        self.assertEqual(sent["messages"], payload["messages"])
        self.assertNotIn("authorization", self.requests[0].headers)
        self.assertTrue(self.clients[0].is_closed)
        self.assertTrue(self.upstreams[0].is_closed)

    def test_query_parameters_and_upstream_errors(self):
        self.response_status = 429
        response = self.client.get("/v1/models?limit=2", headers=self.auth)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(str(self.requests[0].url), "http://127.0.0.1:8000/v1/models?limit=2")

    def test_invalid_json_is_passed_to_upstream_for_validation(self):
        self.response_status = 400
        response = self.client.post("/v1/chat/completions", content=b"invalid", headers=self.auth)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.requests[0].content, b"invalid")

    def test_stream_is_preserved_and_resources_closed(self):
        self.response_type = "text/event-stream"
        self.response_content = b'data: {"delta":"ok"}\n\ndata: [DONE]\n\n'
        response = self.client.post("/v1/chat/completions", json={"stream": True}, headers=self.auth)
        self.assertEqual(response.content, self.response_content)
        self.assertTrue(self.clients[0].is_closed)
        self.assertTrue(self.upstreams[0].is_closed)

    def test_network_failure_closes_client(self):
        self.network_error = httpx.ConnectError("offline")
        with self.assertRaises(httpx.ConnectError):
            self.client.get("/v1/models", headers=self.auth)
        self.assertTrue(self.clients[0].is_closed)

    def test_server_command_preserves_model_and_adapter_contract(self):
        path = Path('/adapters/mint-ai-vlm-v2/final')
        cmd = serve.server_command("mint-ai-vlm-v2", path)
        self.assertEqual(cmd[cmd.index("--model") + 1], "Qwen/Qwen2.5-VL-7B-Instruct")
        self.assertEqual(cmd[cmd.index("--lora-modules") + 1], f"mint-ai-served={path}")
        self.assertEqual(cmd[cmd.index("--host") + 1], "127.0.0.1")
        self.assertNotIn("--trust-remote-code", cmd)

    def test_startup_detects_failed_process(self):
        proc = Mock(returncode=7)
        proc.poll.return_value = 7
        with self.assertRaisesRegex(RuntimeError, "exited with code 7"):
            serve.wait_for_server(proc)

    def test_startup_waits_for_health(self):
        proc = Mock()
        proc.poll.return_value = None
        with patch.object(serve.urllib.request, "urlopen") as health:
            serve.wait_for_server(proc)
        health.assert_called_once()

    def test_startup_timeout_terminates_process(self):
        proc = Mock()
        with self.assertRaisesRegex(RuntimeError, "failed to start"):
            serve.wait_for_server(proc, timeout=0)
        proc.terminate.assert_called_once()

    def test_smoke_check_fails_on_http_or_empty_completion(self):
        for status, payload in ((500, {}), (200, {"choices": [{"message": {"content": ""}}]})):
            response = httpx.Response(status, json=payload, request=httpx.Request("POST", "https://test.invalid"))
            with self.assertRaises((httpx.HTTPStatusError, RuntimeError)):
                serve.check_completion(response)

    def test_lock_preserves_patched_torch_pair(self):
        lock = Path(__file__).with_name("requirements-serve.lock").read_text()
        for name, version in serve.EXPECTED_VERSIONS.items():
            self.assertIn(f"\n{name}=={version}\n", lock)


if __name__ == "__main__":
    unittest.main()
