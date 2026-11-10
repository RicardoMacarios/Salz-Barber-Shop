// Sempre abrir a página no topo ao atualizar
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (location.hash) history.replaceState(null, "", location.pathname + location.search);
window.scrollTo(0, 0);
window.addEventListener("load", () => window.scrollTo(0, 0));

const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Ano automático no rodapé
document.getElementById("ano").textContent = new Date().getFullYear();

// Fotos do espaço carregam todas de uma vez: com "lazy", no celular a foto só começava
// a baixar quando já estava entrando na tela e aparecia um quadro preto até carregar
document.querySelectorAll(".galeria img").forEach((foto) => {
  foto.loading = "eager";
  foto.decoding = "async";
});

// Faixas que passam sem parar: duplica os itens para a volta sem emenda
// (a faixa de serviços e, quando chegarem as fotos dos cortes, a galeria)
document.querySelectorAll(".faixa-trilho, .galeria-trilho, .depoimentos-trilho").forEach((trilho) => {
  [...trilho.children].forEach((item) => {
    const copia = item.cloneNode(true);
    if (copia.alt !== undefined) copia.alt = "";
    copia.setAttribute("aria-hidden", "true");
    trilho.appendChild(copia);
  });
});

// ===== Carrossel da equipe (Juninho, Giovanni, Gabriel) =====
const carrossel = document.querySelector("[data-carrossel]");

if (carrossel) {
  const trilho = carrossel.querySelector(".carrossel-trilho");
  const cartoes = [...trilho.children];
  const nomes = [...carrossel.querySelectorAll("[data-ir]")];
  let atual = 0;
  let automatico = null;

  const irPara = (indice) => {
    atual = (indice + cartoes.length) % cartoes.length;
    trilho.scrollTo({ left: cartoes[atual].offsetLeft - cartoes[0].offsetLeft });
  };

  // Marca o nome do barbeiro que está aparecendo
  const marcar = (indice) => {
    atual = indice;
    nomes.forEach((botao, i) => botao.setAttribute("aria-current", i === indice ? "true" : "false"));
  };

  // Descobre qual cartão está na tela quando a pessoa arrasta
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) marcar(cartoes.indexOf(entrada.target));
    });
  }, { root: trilho, threshold: 0.6 });
  cartoes.forEach((cartao) => observador.observe(cartao));

  // Passa sozinho a cada 6 segundos, como a galeria do Alves.
  // Quando a pessoa mexe, dá uma pausa e depois de 6 segundos volta a passar sozinho
  let retomar = null;
  let comecou = false;

  const iniciarAutomatico = () => {
    clearInterval(automatico);
    automatico = setInterval(() => irPara(atual + 1), 6000);
  };

  const pararAutomatico = () => {
    clearInterval(automatico);
    clearTimeout(retomar);
    automatico = null;
    if (comecou) retomar = setTimeout(iniciarAutomatico, 6000);
  };

  const setas = document.querySelectorAll("[data-anterior], [data-proximo]");
  setas.forEach((seta) => seta.addEventListener("click", () => {
    pararAutomatico();
    irPara(atual + (seta.hasAttribute("data-proximo") ? 1 : -1));
  }));

  nomes.forEach((botao) => botao.addEventListener("click", () => {
    pararAutomatico();
    irPara(Number(botao.dataset.ir));
  }));

  ["pointerdown", "wheel", "keydown", "focusin"].forEach((evento) => {
    trilho.addEventListener(evento, pararAutomatico, { passive: true });
  });

  // Só começa a passar quando a seção aparece na tela
  if (!semMovimento) {
    const quandoVisivel = new IntersectionObserver(([entrada]) => {
      if (!entrada.isIntersecting) return;
      quandoVisivel.disconnect();
      comecou = true;
      iniciarAutomatico();
    }, { threshold: 0.5 });
    quandoVisivel.observe(trilho);
  }
}

// ===== Serviços: abas por categoria =====
// Sem JavaScript aparecem todos os serviços; com ele, um grupo de cada vez
const abasServicos = document.querySelector(".servicos-abas");

if (abasServicos) {
  const botoesAba = [...abasServicos.querySelectorAll("[data-filtro]")];
  const cartoesServico = [...document.querySelectorAll(".servico")];

  const mostrarCategoria = (categoria) => {
    botoesAba.forEach((botao) => botao.setAttribute("aria-pressed", botao.dataset.filtro === categoria ? "true" : "false"));
    cartoesServico.forEach((cartao) => { cartao.hidden = cartao.dataset.categoria !== categoria; });
  };

  botoesAba.forEach((botao) => botao.addEventListener("click", () => mostrarCategoria(botao.dataset.filtro)));
  abasServicos.hidden = false;
  mostrarCategoria("principal");
}

// ===== Horários: aviso "Aberto agora" e destaque do dia de hoje =====
// Horários do AppBarber (se mudarem, atualizar também a lista do index.html)
// Turnos de cada dia em minutos desde meia-noite [abre, fecha] (0 = domingo)
const h = (hora, min = 0) => hora * 60 + min;
const horarios = {
  0: [],
  1: [[h(10), h(12)], [h(13, 30), h(18, 30)]],
  2: [[h(9), h(12)], [h(13, 30), h(20)]],
  3: [[h(9), h(12)], [h(13, 30), h(20)]],
  4: [[h(9), h(12)], [h(13, 30), h(20)]],
  5: [[h(8, 30), h(11, 30)], [h(13, 30), h(20)]],
  6: [[h(8), h(11)], [h(13), h(16, 30)]],
};
const nomesDias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const formatarHora = (min) => `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;

// Usa o horário de Brasília, mesmo que o visitante esteja em outro fuso
const agora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const hoje = agora.getDay();
const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

document.querySelectorAll(".horarios li").forEach((linha) => {
  if (linha.dataset.dias.split(" ").includes(String(hoje))) linha.classList.add("hoje");
});

const turnoAtual = horarios[hoje].find(([abre, fecha]) => minutosAgora >= abre && minutosAgora < fecha);
let textoStatus;

if (turnoAtual) {
  textoStatus = `Aberto agora · fecha às ${formatarHora(turnoAtual[1])}`;
} else {
  // Procura a próxima abertura (pode ser hoje mesmo, depois do almoço)
  textoStatus = "Fechado agora";
  for (let i = 0; i < 7; i++) {
    const dia = (hoje + i) % 7;
    const proximo = horarios[dia].find(([abre]) => i > 0 || abre > minutosAgora);
    if (!proximo) continue;
    const quando = i === 0 ? "hoje" : i === 1 ? "amanhã" : nomesDias[dia];
    textoStatus += ` · abre ${quando} às ${formatarHora(proximo[0])}`;
    break;
  }
}

// O aviso aparece em cima da foto da primeira tela e no cartão de horários
document.querySelectorAll("[data-status]").forEach((status) => {
  status.textContent = textoStatus;
  status.classList.add(turnoAtual ? "aberto" : "fechado");
  status.hidden = false;
});

// ===== Elementos aparecem deslizando quando entram na tela =====
if ("IntersectionObserver" in window && !semMovimento) {
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add("visivel");
      observador.unobserve(entrada.target);
    });
  }, { threshold: 0.15 });

  const grupos = [
    ".rotulo", ".secao h2", ".secao-intro", ".carrossel", ".servicos-abas", ".lista-servicos", ".link-seta",
    ".assinatura", ".comodidades", ".avaliacoes-conteudo", ".mapa-bloco", ".cartao", ".tile", ".chamada", ".galeria", ".galeria-acoes",
  ];
  grupos.forEach((seletor) => {
    document.querySelectorAll(seletor).forEach((elemento, i) => {
      elemento.classList.add("revelar");
      // Itens do mesmo grupo entram um pouco depois do outro
      elemento.style.transitionDelay = `${Math.min(i, 5) * 70}ms`;
      observador.observe(elemento);
    });
  });
}

// ===== Botão flutuante do WhatsApp =====
// Só aparece depois que a pessoa rola além dos botões da primeira tela (lá já tem WhatsApp)
const flutuante = document.querySelector(".whatsapp-flutuante");
const acoesInicio = document.querySelector(".hero .acoes");

if (flutuante && acoesInicio) {
  const atualizarFlutuante = () => {
    const passou = acoesInicio.getBoundingClientRect().bottom < 0;
    flutuante.classList.toggle("escondido", !passou);
  };
  atualizarFlutuante();
  addEventListener("scroll", atualizarFlutuante, { passive: true });
  addEventListener("resize", atualizarFlutuante);
}

// ===== Menu no celular =====
const botaoMenu = document.querySelector(".menu-botao");
const menu = document.getElementById("menu");

const fecharMenu = () => {
  menu.classList.remove("aberto");
  document.body.classList.remove("menu-aberto");
  botaoMenu.setAttribute("aria-expanded", "false");
  botaoMenu.setAttribute("aria-label", "Abrir menu");
};

botaoMenu.addEventListener("click", () => {
  const aberto = menu.classList.toggle("aberto");
  document.body.classList.toggle("menu-aberto", aberto); // a página atrás não rola
  botaoMenu.setAttribute("aria-expanded", aberto);
  botaoMenu.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
});

// Fecha o menu ao clicar em um link, ao apertar Esc ou se a tela ficar larga (virou computador)
menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", fecharMenu));
addEventListener("keydown", (evento) => { if (evento.key === "Escape") fecharMenu(); });
matchMedia("(min-width: 761px)").addEventListener("change", (m) => { if (m.matches) fecharMenu(); });
