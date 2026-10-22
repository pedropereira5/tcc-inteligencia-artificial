
const MODEL = 'gemini-3.8-flash';

const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 1200;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;
const REQUEST_TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 3;

const API_KEY_ENV = 'GEMINI_API_KEY';

// Limite simples por instância da função.
const requestCounts = new Map();

const SYSTEM_INSTRUCTION = `
Você é o J.A.R.V.I.S., assistente experimental do site de um TCC escolar
sobre Inteligência Artificial na Sociedade e na Tecnologia da Informação:
Impactos, Aplicações e Cotidiano.

O autor do TCC é Pedro Pereira Leite, aluno do Instituto Coração de Jesus,
em 2026.

Sua função é explicar Inteligência Artificial de forma educativa,
correta, acessível e interessante para visitantes de uma feira de profissões.

REGRAS IMPORTANTES:

1. Responda sempre em português brasileiro, salvo se o usuário pedir outro idioma.

2. Seja educado, natural, simpático e direto. Você é um assistente educativo,
não o próprio ChatGPT nem o próprio Gemini.

3. Explique conceitos com exemplos simples, especialmente relacionados à
educação, saúde, programação, segurança digital, mercado de trabalho e TI.

4. Se perguntarem sobre a história da IA, explique os principais marcos,
incluindo as primeiras ideias sobre lógica, o trabalho de Alan Turing,
o modelo de neurônio artificial de McCulloch e Pitts em 1943,
a Conferência de Dartmouth em 1956, os sistemas especialistas,
o aprendizado de máquina e os modelos generativos atuais.

5. Não invente informações, estatísticas, citações ou referências.
Quando não tiver certeza, diga isso claramente.

6. Responda à pergunta feita. Não repita toda a apresentação inicial
em cada mensagem.

7. Evite respostas excessivamente longas. Use tópicos quando ajudarem
na compreensão, mas desenvolva o suficiente para responder por completo.

8. Para perguntas que pedem uma explicação ou um resumo, organize a resposta
em começo, desenvolvimento e conclusão, quando isso fizer sentido.

9. Não termine respostas no meio de uma frase. Revise mentalmente a resposta
antes de enviá-la e conclua o raciocínio.

10. Se o usuário disser que a resposta foi cortada, peça desculpas brevemente
e forneça uma versão completa e organizada, evitando simplesmente repetir
o mesmo texto incompleto.

11. Explique os benefícios, limitações, riscos éticos, vieses, privacidade
e impactos sociais da IA quando forem relevantes ao assunto.

12. Não afirme que você consegue acessar arquivos, sites, câmeras,
sistemas ou dados privados se isso não estiver disponível nesta conversa.

13. Ao falar do TCC, mantenha o foco no tema e na finalidade educativa
do projeto. Não invente resultados de pesquisa que não foram fornecidos.

14. Seja útil também para visitantes que não têm conhecimentos técnicos.
Defina termos difíceis antes de aprofundá-los.

15. Se a pergunta fugir do tema da IA, ajude brevemente quando possível
e, se fizer sentido, relacione a resposta ao tema do TCC.

Sua prioridade é fornecer respostas completas, compreensíveis,
responsáveis e adequadas a uma apresentação escolar.
`;

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(data));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay(attempt) {
  const exponentialDelay = 1000 * (2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 500);
  return exponentialDelay + jitter;
}

function normalizeMessages(input) {
  if (!Array.isArray(input)) return null;

  const validMessages = input
    .slice(-MAX_MESSAGES)
    .map((item) => {
      if (!item || typeof item.text !== 'string') return null;

      const role = item.role === 'assistant' ? 'model' : item.role;

      if (role !== 'user' && role !== 'model') return null;

      const text = item.text.trim();

      if (!text || text.length > MAX_MESSAGE_CHARS) return null;

      return {
        role,
        parts: [{ text }]
      };
    });

  if (validMessages.some((item) => item === null)) return null;
  if (validMessages.length === 0) return null;

  if (validMessages[validMessages.length - 1].role !== 'user') {
    return null;
  }

  // O Gemini exige alternância entre usuário e modelo.
  const alternatingMessages = [];

  for (const message of validMessages) {
    const previous = alternatingMessages[alternatingMessages.length - 1];

    if (previous && previous.role === message.role) {
      previous.parts[0].text += '\n\n' + message.parts[0].text;
    } else {
      alternatingMessages.push({
        role: message.role,
        parts: [{ text: message.parts[0].text }]
      });
    }
  }

  return alternatingMessages;
}

function isRateLimited(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : 'unknown';

  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now - entry.start >= RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(ip, { start: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, {
      error: 'Método não permitido.'
    });
  }

  if (isRateLimited(req)) {
    return sendJson(res, 429, {
      error: 'Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente.'
    });
  }

  const apiKey = process.env[API_KEY_ENV];

  if (!apiKey) {
    console.error(`Variável de ambiente ${API_KEY_ENV} não encontrada.`);

    return sendJson(res, 500, {
      error: 'A chave da API não está configurada na Vercel.'
    });
  }

  const messages = normalizeMessages(req.body?.messages);

  if (!messages) {
    return sendJson(res, 400, {
      error: 'Mensagens inválidas. Envie uma pergunta com até 1.200 caracteres.'
    });
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const payload = {
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    contents: messages,
    generationConfig: {
      maxOutputTokens: 1500,
      thinkingConfig: {
        thinkingLevel: 'low'
      }
    }
  };

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const data = await upstream.json().catch(() => ({}));

      if (!upstream.ok) {
        const details = {
          attempt,
          httpStatus: upstream.status,
          status: data.error?.status || null,
          message: data.error?.message || 'Sem detalhes fornecidos'
        };

        console.error('Erro da Gemini API:', JSON.stringify(details));

        const retryable =
          upstream.status === 408 ||
          upstream.status === 429 ||
          upstream.status >= 500;

        if (retryable && attempt < MAX_ATTEMPTS) {
          await sleep(retryDelay(attempt));
          continue;
        }

        if (upstream.status === 400 || upstream.status === 404) {
          return sendJson(res, 502, {
            error: 'Erro na solicitação ou modelo indisponível. Consulte os logs da Vercel.'
          });
        }

        if (upstream.status === 401 || upstream.status === 403) {
          return sendJson(res, 502, {
            error: 'A chave da API foi recusada. Confira GEMINI_API_KEY na Vercel.'
          });
        }

        if (upstream.status === 429) {
          return sendJson(res, 429, {
            error: 'Limite de uso da API atingido. Tente novamente mais tarde.'
          });
        }

        return sendJson(res, 502, {
          error: 'O Gemini está temporariamente indisponível. Tente novamente.'
        });
      }

      const candidate = data.candidates?.[0];

      const reply = candidate?.content?.parts
        ?.map((part) => typeof part.text === 'string' ? part.text : '')
        .filter(Boolean)
        .join('\n')
        .trim();

      if (!reply) {
        console.error(
          'Gemini sem texto:',
          JSON.stringify({
            finishReason: candidate?.finishReason || null,
            promptFeedback: data.promptFeedback || null
          })
        );

        return sendJson(res, 502, {
          error: 'O Gemini não retornou uma resposta em texto. Tente reformular a pergunta.'
        });
      }

      if (candidate.finishReason === 'MAX_TOKENS') {
        console.warn('A resposta atingiu o limite de tokens.');
      }

      return sendJson(res, 200, {
        reply,
        model: MODEL,
        finishReason: candidate.finishReason || null
      });
    } catch (error) {
      lastError = error;

      console.error(
        'Falha ao conectar à Gemini API:',
        JSON.stringify({
          attempt,
          name: error?.name || 'Erro',
          message: error?.message || 'Sem detalhes'
        })
      );

      if (attempt < MAX_ATTEMPTS) {
        await sleep(retryDelay(attempt));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return sendJson(res, 502, {
    error: lastError?.name === 'AbortError'
      ? 'O Gemini demorou demais para responder. Tente novamente.'
      : 'Não foi possível conectar ao Gemini. Consulte os logs da Vercel.'
  });
};
