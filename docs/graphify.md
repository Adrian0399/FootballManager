# Graphify — Knowledge Graph del proyecto

Esta guía explica cómo instalar **graphify**, generar el grafo de conocimiento
del código y visualizarlo en el navegador.

> **Paquete PyPI**: `graphifyy` (doble‑y) · **Comando CLI**: `graphify`
> **Repo oficial**: https://github.com/safishamsi/graphify
>
> Requiere **Python ≥ 3.10**. En macOS el camino más corto es via `uv`.

---

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Homebrew | cualquiera | instalar `uv` |
| Python | ≥ 3.10 | (lo trae `uv` si hace falta) |
| uv | ≥ 0.12 | instalar `graphifyy` aislado |
| graphifyy | última | la CLI (`graphify`) |

> Si tu sistema tiene un Python antiguo (3.9 como el de Apple en macOS), no
> toques el del sistema: usa siempre `uv` para que todo quede aislado en
> `~/.local/share/uv`.

---

## 2. Instalación (una sola vez por máquina)

```bash
brew install uv
uv tool install graphifyy
```

Tras instalar, `uv` deja el binario en `~/.local/bin/graphify` pero **esa
carpeta no está en tu `PATH` por defecto**. Hay dos formas de arreglarlo:

### A) Permanente (recomendado)

```bash
uv tool update-shell   # añade ~/.local/bin al ~/.zshrc automáticamente
exec $SHELL -l
```

### B) Solo para la sesión actual

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Verificación

```bash
command -v graphify
# debe imprimir: /Users/<tu-usuario>/.local/bin/graphify

graphify --version
```

---

## 3. Generar el grafo

Desde la **raíz del proyecto**:

```bash
graphify . --code-only
```

Flags útiles:

| Flag | Efecto |
|---|---|
| `--code-only` | solo AST local, no usa LLM, salta `.md`/PDFs/imágenes |
| `--update` | reindex incremental — conserva `graph.json` previo |
| `--no-viz` | no genera HTML (más rápido, útil en CI) |

Salida esperada:

```
graphify-out/
├── graph.json             ← datos del grafo (lo usa el plugin de OpenCode)
├── graph.html             ← vista interactiva (Cytoscape)
├── GRAPH_TREE.html        ← árbol D3 colapsable por comunidades
├── <Proyecto>-callflow.html  ← callflow Mermaid
├── manifest.json
└── cache/
```

> **¿Y si quieres incluir la documentación?** Exporta una API key y vuelve a
> correr `graphify .` sin `--code-only`. Cualquiera de estas sirve:
> `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `MOONSHOT_API_KEY`, `ANTHROPIC_API_KEY`,
> `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`. **Gemini** suele ser la opción más
> barata (con tier free).

---

## 4. Visualizaciones

Todas se generan en `graphify-out/` y se abren en cualquier navegador moderno.

### 4.1 HTML interactivo (Cytoscape) — recomendada

```bash
graphify export html
open graphify-out/graph.html
```

Permite pan/zoom, click en nodos, filtros por tipo/comunidad.

### 4.2 Árbol D3 colapsable — buena para jerarquías

```bash
graphify tree
open graphify-out/GRAPH_TREE.html
```

Vista de árbol que se expande/contrae por comunidades y depth.

### 4.3 Call flow / arquitectura (Mermaid)

```bash
graphify export callflow-html
open graphify-out/<Proyecto>-callflow.html
```

Diagrama de llamadas entre módulos. **Importante**: ábrelo en un navegador
real (Safari/Chrome/Firefox), no en Vista Previa de macOS — necesita JS.

### 4.4 (Opcional) Servir por HTTP local

```bash
cd graphify-out
python3 -m http.server 8000
```

Luego abre <http://localhost:8000/graph.html> en el navegador. Útil si las
vistas no cargan al hacer doble clic (algunos navegadores bloquean `fetch`
sobre `file://`).

### 4.5 Abrir con navegador específico

```bash
open -a "Google Chrome" graphify-out/graph.html
open -a "Firefox"       graphify-out/graph.html
open -a "Safari"        graphify-out/graph.html
```

### 4.6 Subir a la UI oficial

Puedes arrastrar `graph.json` o `GRAPH_REPORT.md` a **https://app.graphify.com**
para la UI completa en la nube (no requiere cuenta según el proyecto).

---

## 5. Consultas por línea de comandos

Una vez tengas `graph.json`, puedes preguntar al grafo sin abrir nada:

```bash
# Subgrafo acotado por una pregunta en lenguaje natural
graphify query "¿cómo funciona la autenticación?"

# Camino entre dos conceptos
graphify path "auth.controller" "auth.service"

# Explicación de un nodo + su vecindario
graphify explain "UserRepository"

# Nodos más conectados (hubs / god nodes)
graphify god-nodes --top 10

# Nodos afectados si cambio X
graphify affected "auth.middleware" --depth 2
```

---

## 6. Plugin de OpenCode

El proyecto incluye `.opencode/plugins/graphify.js`. Es un **hook automático**
que se activa al iniciar opencode (ya está cargado en
`.opencode/opencode.json`). Su única condición:

> 🔑 Si `graphify-out/graph.json` existe → el hook prepende un recordatorio
> en cada `bash` para que el modelo use `graphify query` en lugar de `grep`.

**No requiere acción manual**. Solo asegúrate de haber corrido
`graphify . --code-only` al menos una vez.

Tras modificar código, refresca el grafo:

```bash
graphify update .   # AST-only, sin API key, tarda segundos
```

---

## 7. Workflow recomendado

```bash
# 1. Setup inicial (una vez)
brew install uv
uv tool install graphifyy
uv tool update-shell
exec $SHELL -l

# 2. Generar grafo del proyecto
cd /ruta/al/proyecto
graphify . --code-only
graphify export html
graphify tree
graphify export callflow-html

# 3. Explorar
open graphify-out/graph.html

# 4. Preguntar al grafo
graphify query "¿dónde se validan los tokens JWT?"
graphify path "LoginController" "TokenService"

# 5. Tras editar código
graphify update .
```

---

## 8. Solución de problemas

### `zsh: command not found: graphify`

El PATH no se cargó. Ejecuta:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

O, si quieres que sea permanente:

```bash
uv tool update-shell
exec $SHELL -l
```

### `error: no LLM API key found`

Estás indexando docs/PDFs/imágenes. Tienes dos salidas:

```bash
# A) Saltar archivos no‑código (gratis, local, recomendado en CI)
graphify . --code-only

# B) Configurar un LLM (más rico, incluye semántica de docs)
export GEMINI_API_KEY=tu_clave
graphify .
```

### El HTML se ve en blanco al hacer doble clic

Algunos navegadores bloquean JS desde `file://`. Solución:

```bash
cd graphify-out
python3 -m http.server 8000
# abre http://localhost:8000/graph.html
```

### Powerlevel10k avisa de output en `.zshrc`

No relacionado con graphify. El `.zshrc` está imprimiendo algo durante la
inicialización (probablemente el alias `ng` roto en la línea 24). Elimina
la línea problemática y el warning desaparece.

---

## 9. Referencias

- **Repo oficial**: https://github.com/safishamsi/graphify
- **PyPI**: https://pypi.org/project/graphifyy/
- **UI web**: https://app.graphify.com
- **uv**: https://docs.astral.sh/uv/
