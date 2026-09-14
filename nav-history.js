/*!
 * Celia Decorações — Histórico de Navegação (nav-history.js)
 * ------------------------------------------------------------------
 * Faz o botão/gesto físico de "Voltar" do Android (e também o comando
 * javascript:history.back() usado nos links "Voltar" das páginas)
 * SEMPRE levar para a tela anterior correta do app — em vez de fechar
 * a página/app inteiro — e, quando existir um modal, popup ou imagem
 * em tela cheia (lightbox) aberto, o primeiro "Voltar" apenas fecha
 * esse overlay, sem sair da página.
 *
 * Como funciona (resumo técnico):
 * 1) Ao carregar, cada página empilha um "estado de guarda" no
 *    histórico do navegador (history.pushState). Isso garante que o
 *    próximo "Voltar" dispare o evento `popstate` primeiro, em vez de
 *    já fechar a página/app imediatamente.
 * 2) Quando o `popstate` é disparado:
 *      a) Se houver algum overlay registrado aberto (modal, lightbox,
 *         carrinho, etc.) → fecha o overlay e recoloca a guarda,
 *         "armando" o histórico para o próximo Voltar.
 *      b) Se não houver overlay aberto e a página tiver uma "tela
 *         anterior" definida no mapa abaixo → navega para ela.
 *      c) Se a página for uma tela raiz (Tela Inicial / Abertura),
 *         deixa o comportamento seguir o padrão do navegador/app
 *         (volta para a página real anterior, se existir, ou fecha
 *         o app — comportamento nativo esperado pelo Android).
 *
 * Cada página registra seus próprios overlays chamando:
 *   window.CDNavHistory.registerOverlay(estaAbertoFn, fecharFn)
 * onde `estaAbertoFn()` retorna true/false e `fecharFn()` fecha o
 * overlay. Isso já está feito em todas as páginas do site.
 */
(function () {
  "use strict";

  // Evita registrar tudo de novo caso o script seja incluído 2x.
  if (window.CDNavHistory && window.CDNavHistory.__cdInstalled) return;

  /* ── Mapa de telas: para onde o Voltar deve levar cada página ──
     null = tela raiz (não força nada, segue o padrão do sistema). */
  var PARENT_MAP = {
    "index.html": null,
    "": null,               // domínio raiz "/" (mesma tela de abertura)
    "telainicial.html": null,

    "alugueis.html": "telainicial.html",
    "decoracoes.html": "telainicial.html",
    "espaco.html": "telainicial.html",
    "pacotedia.html": "telainicial.html",
    "pacotenoite.html": "telainicial.html",
    "peguemonte.html": "telainicial.html",
    "promocao.html": "telainicial.html",

    "calendario.html": "promocao.html"
  };

  var HAS_HISTORY_API =
    !!(window.history && typeof window.history.pushState === "function");

  var overlays = [];
  var guardArmed = false;

  function nomeDaPaginaAtual() {
    try {
      var caminho = window.location.pathname || "";
      var nome = caminho.substring(caminho.lastIndexOf("/") + 1);
      return nome || "";
    } catch (e) {
      return "";
    }
  }

  function paginaPai() {
    var atual = nomeDaPaginaAtual();
    return Object.prototype.hasOwnProperty.call(PARENT_MAP, atual)
      ? PARENT_MAP[atual]
      : null; // página desconhecida: não força navegação, comportamento nativo
  }

  function empilharGuarda() {
    if (!HAS_HISTORY_API) return;
    try {
      history.pushState(
        { cdNavGuard: true, t: Date.now() },
        document.title || "",
        window.location.href
      );
      guardArmed = true;
    } catch (e) {
      guardArmed = false;
    }
  }

  function overlayAberto() {
    for (var i = 0; i < overlays.length; i++) {
      try {
        if (overlays[i].estaAberto()) return overlays[i];
      } catch (e) {
        /* overlay com erro não deve travar a navegação */
      }
    }
    return null;
  }

  function fecharTodosOverlaysAbertos() {
    var fechouAlgum = false;
    for (var i = 0; i < overlays.length; i++) {
      try {
        if (overlays[i].estaAberto()) {
          overlays[i].fechar();
          fechouAlgum = true;
        }
      } catch (e) {
        /* ignora erro de um overlay específico e continua os demais */
      }
    }
    return fechouAlgum;
  }

  function aoVoltar() {
    // 1) Overlay aberto? Só fecha e mantém o usuário na mesma página.
    if (overlayAberto()) {
      fecharTodosOverlaysAbertos();
      empilharGuarda(); // re-arma a guarda para o próximo Voltar
      return;
    }

    // 2) Tem tela anterior definida? Vai sempre para ela.
    var pai = paginaPai();
    if (pai) {
      try {
        window.location.replace("./" + pai);
      } catch (e) {
        window.location.href = "./" + pai;
      }
      return;
    }

    // 3) Tela raiz (Tela Inicial / Abertura): não força nada além do
    // padrão nativo. Como a guarda já foi consumida por este Voltar,
    // um próximo toque no botão Voltar sairá do app normalmente, ou —
    // se houver uma página real anterior no navegador (ex.: veio do
    // index.html) — o próprio sistema levará o usuário até ela.
    guardArmed = false;
  }

  if (HAS_HISTORY_API) {
    window.addEventListener("popstate", aoVoltar);
    // Cria a guarda inicial assim que o script carrega.
    empilharGuarda();

    // Se a página voltar a ficar visível (ex.: retomada do app em
    // segundo plano) e a guarda não estiver mais armada, rearma.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && !guardArmed) {
        empilharGuarda();
      }
    });
  }

  window.CDNavHistory = {
    __cdInstalled: true,

    /**
     * Registra um overlay (modal, lightbox, carrinho, menu, etc.).
     * @param {Function} estaAbertoFn - retorna true se o overlay está aberto.
     * @param {Function} fecharFn - fecha o overlay.
     */
    registerOverlay: function (estaAbertoFn, fecharFn) {
      if (typeof estaAbertoFn === "function" && typeof fecharFn === "function") {
        overlays.push({ estaAberto: estaAbertoFn, fechar: fecharFn });
      }
    }
  };
})();
