# PedidoDigital — MVP

Este é um **MVP funcional** desenvolvido para um case técnico. O objetivo é demonstrar, de forma simples e direta, como uma distribuidora de alimentos pode interpretar pedidos enviados em texto livre (WhatsApp, e-mail, telefone transcrito) e convertê-los em pedidos estruturados com auxílio de IA.

> **Aviso:** este projeto é uma prova de conceito. Não possui autenticação, banco de dados ou persistência real. Todos os dados são armazenados em memória e perdidos ao reiniciar o servidor.

---

## O que o sistema faz

1. O operador cola o pedido em texto livre.
2. A IA interpreta os itens, quantidades e unidades.
3. O sistema valida o resultado e sinaliza inconsistências.
4. O operador pode editar os itens antes de aprovar.
5. O pedido aprovado entra na lista de pedidos.

---

## Tecnologias

- **Backend:** FastAPI + Python
- **Frontend:** React + Vite
- **IA:** OpenAI GPT (via API oficial)
- **Deploy:** Render (backend) e Vercel (frontend)

---

## Como rodar localmente

### Backend

```bash
cd backend
cp .env.example .env
# edite .env e adicione sua OPENAI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173` e o backend em `http://localhost:8000`.

---

## Deploy

- **Backend:** deploy na pasta `backend` no Render. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- **Frontend:** deploy da pasta `frontend` na Vercel. Variável de ambiente: `VITE_API_URL=<url-do-backend>`.

---

## Escopo propositalmente limitado

Para manter o foco no case técnico, este MVP **não inclui**:

- autenticação de usuários;
- banco de dados persistente;
- testes automatizados;
- filas, workers ou microserviços;
- CRUD de catálogo.

---

## Estrutura

```txt
/backend     → FastAPI
/frontend    → React + Vite
```
