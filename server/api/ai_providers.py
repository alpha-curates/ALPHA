import requests, json, os, base64, io
from config import Config

class BaseProvider:
    def __init__(self, config: dict):
        self.name = config.get('name', 'AI')
        self.api_key = config.get('api_key', '')
        self.api_url = config.get('api_url', '')
        self.model = config.get('default_model', '')

    def chat(self, messages: list, model: str = '') -> str:
        raise NotImplementedError

    def list_models(self) -> list:
        return []

class OllamaProvider(BaseProvider):
    def __init__(self, config=None):
        super().__init__(config or {})
        self.api_url = Config.OLLAMA_URL

    def chat(self, messages, model=''):
        model = model or 'llama3.2:1b'
        prompt = '\n'.join(f"{m['role']}: {m['content']}" for m in messages[-10:]) if len(messages) > 1 else messages[-1]['content']
        try:
            r = requests.post(f'{self.api_url}/api/generate', json={'model': model, 'prompt': prompt, 'stream': False, 'options': {'num_predict': 4096}}, timeout=120)
            if r.status_code == 200: return r.json().get('response', '')
        except Exception as e: return f'Error: {str(e)}'
        return 'Ollama unavailable'

    def list_models(self):
        try:
            r = requests.get(f'{self.api_url}/api/tags', timeout=5)
            if r.status_code == 200: return [m['name'] for m in r.json().get('models', [])]
        except: pass
        return []

class OpenAICompatibleProvider(BaseProvider):
    def chat(self, messages, model=''):
        model = model or self.model or 'gpt-3.5-turbo'
        headers = {'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'}
        body = {'model': model, 'messages': messages, 'max_tokens': 4096}
        try:
            r = requests.post(f'{self.api_url}/v1/chat/completions', json=body, headers=headers, timeout=120)
            if r.status_code == 200: return r.json()['choices'][0]['message']['content']
            return f'API error: {r.status_code} - {r.text[:200]}'
        except Exception as e: return f'Error: {str(e)}'

    def list_models(self):
        headers = {'Authorization': f'Bearer {self.api_key}'}
        try:
            r = requests.get(f'{self.api_url}/v1/models', headers=headers, timeout=10)
            if r.status_code == 200: return [m['id'] for m in r.json().get('data', [])[:50]]
        except: pass
        return []

class GeminiProvider(BaseProvider):
    def chat(self, messages, model=''):
        model = model or self.model or 'gemini-pro'
        # Build Gemini-style content from messages
        contents = []
        for m in messages:
            role = 'user' if m['role'] in ('user', 'system') else 'model'
            contents.append({'role': role, 'parts': [{'text': m['content']}]})
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}'
        try:
            r = requests.post(url, json={'contents': contents}, timeout=120)
            if r.status_code == 200:
                candidates = r.json().get('candidates', [])
                if candidates: return candidates[0].get('content', {}).get('parts', [{}])[0].get('text', '')
            return f'API error: {r.text[:200]}'
        except Exception as e: return f'Error: {str(e)}'

    def list_models(self):
        url = f'https://generativelanguage.googleapis.com/v1beta/models?key={self.api_key}'
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                return [m['name'].replace('models/', '') for m in r.json().get('models', []) if 'generateContent' in m.get('supportedMethods', [])]
        except: pass
        return ['gemini-pro']

class ClaudeProvider(BaseProvider):
    def chat(self, messages, model=''):
        model = model or self.model or 'claude-3-haiku-20240307'
        headers = {'x-api-key': self.api_key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json'}
        system = ''
        msgs = []
        for m in messages:
            if m['role'] == 'system': system += m['content'] + '\n'
            elif m['role'] in ('user', 'assistant'): msgs.append({'role': m['role'], 'content': m['content']})
        if not msgs: msgs = [{'role': 'user', 'content': 'Hello'}]
        body = {'model': model, 'max_tokens': 4096, 'messages': msgs}
        if system: body['system'] = system.strip()
        try:
            r = requests.post('https://api.anthropic.com/v1/messages', json=body, headers=headers, timeout=120)
            if r.status_code == 200: return r.json()['content'][0]['text']
            return f'API error: {r.status_code} - {r.text[:200]}'
        except Exception as e: return f'Error: {str(e)}'

    def list_models(self):
        return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022']

PROVIDER_MAP = {
    'ollama': OllamaProvider,
    'openai': OpenAICompatibleProvider,
    'gemini': GeminiProvider,
    'claude': ClaudeProvider,
}

def get_provider(provider_type: str, config: dict = None) -> BaseProvider:
    cls = PROVIDER_MAP.get(provider_type)
    if not cls: return OllamaProvider(config)
    return cls(config)

def get_provider_from_db(db_provider):
    import json as j
    config = {
        'name': db_provider.name,
        'api_key': db_provider.api_key,
        'api_url': db_provider.api_url,
        'default_model': db_provider.default_model,
    }
    models = []
    try: models = j.loads(db_provider.models)
    except: pass
    return get_provider(db_provider.provider_type, config), models
