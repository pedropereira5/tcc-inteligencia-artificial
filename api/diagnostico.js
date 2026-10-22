module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({
      ok: false,
      error: 'Método não permitido.'
    }));
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.statusCode = 500;
    return res.end(JSON.stringify({
      ok: false,
      error: 'Chave GEMINI_API_KEY não encontrada.'
    }));
  }

  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(
    () => controller.abort(),
    8000
  );

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey
        },
        signal: controller.signal
      }
    );

    const data = await response.json().catch(() => ({}));

    res.statusCode = response.ok ? 200 : 502;

    return res.end(JSON.stringify({
      ok: response.ok,
      statusGoogle: response.status,
      tempoMs: Date.now() - startedAt,
      erro: response.ok
        ? null
        : data.error?.message || 'Erro retornado pelo Google.'
    }));
  } catch (error) {
    res.statusCode = 502;

    return res.end(JSON.stringify({
      ok: false,
      tempoMs: Date.now() - startedAt,
      erro: error.name === 'AbortError'
        ? 'O teste ultrapassou 8 segundos.'
        : 'Falha na conexão com o Google.'
    }));
  } finally {
    clearTimeout(timeout);
  }
};
