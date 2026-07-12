# Tchitundo-Hulo · Standard Bank Angola

Plataforma editorial institucional com website público, backoffice protegido por MFA, estatísticas próprias e execução em Docker na porta `7788`.

## Arranque local

Requer Node.js 22 ou superior.

```bash
npm ci
npm run dev
```

## Docker

Copie `.env.example` para `.env`, substitua as credenciais e gere chaves aleatórias diferentes para sessão e MFA.

```bash
docker compose up -d --build
```

O website fica em `/` e o backoffice em `/admin`. Os dados persistentes são guardados no volume `tchitundo_content`.

## Configuração de segurança

- `BACKOFFICE_SESSION_SECRET` deve ter pelo menos 32 caracteres aleatórios.
- `BACKOFFICE_MFA_ENCRYPTION_KEY` deve ser uma chave aleatória diferente da chave de sessão.
- `APP_ALLOWED_HOSTS` deve conter os hosts públicos autorizados, separados por vírgulas e incluindo a porta quando aplicável.
- Active `TRUST_PROXY_HEADERS=true` apenas quando existe um reverse proxy controlado que elimina os cabeçalhos `X-Forwarded-*` recebidos e escreve os seus próprios valores.
- Em produção, a porta 7788 deve ficar atrás do reverse proxy ou WAF do banco com HTTPS. Não deve ser exposta directamente à Internet.
- Preserve a chave de sessão actual durante a primeira actualização para manter compatibilidade com os MFA já registados.

Exemplo de hosts:

```dotenv
APP_ALLOWED_HOSTS=patrimonio.standardbank.co.ao
TRUST_PROXY_HEADERS=true
```

## Controlos implementados

- Passwords PBKDF2-HMAC-SHA256 com 600.000 iterações e salt individual.
- Troca obrigatória da password temporária.
- MFA TOTP obrigatório e cifrado com AES-GCM.
- Sessões opacas revogáveis, 30 minutos de inactividade e máximo de 8 horas.
- Invalidação após logout, alteração de password, MFA, perfil ou estado da conta.
- Protecção de origem, validação de host, limites de pedidos e rate limiting.
- Validação de assinatura de JPG, PNG, WEBP e PDF antes do armazenamento.
- Registo de auditoria em `/app/data/audit.jsonl`.
- CSP, HSTS em HTTPS, protecção contra framing e restantes headers de segurança.
- Container sem privilégios, read-only, sem capabilities e com limites de recursos.

## Validação

```bash
npm run security:check
docker compose config --quiet
```

O repositório executa build, lint, testes e auditoria de dependências em cada alteração à branch principal e semanalmente.

## Limites da Fase 1

Esta versão continua orientada para uma única réplica Docker. A passagem para PostgreSQL, Redis, object storage, SIEM, antivírus corporativo, WAF e identidade/SSO do banco pertence à Fase 2.
