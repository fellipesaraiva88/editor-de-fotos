/**
 * Response Manager
 * Centralizes all copy and persona logic for the WhatsApp bot.
 * Provides dynamic variations to make the bot feel less robotic.
 *
 * UX PRINCIPLES:
 * - Aspirational: Usuário quer parecer bem, se destacar
 * - Low-friction: Sempre guiar próximo passo
 * - Value-first: Celebrar conquistas, suavizar barreiras
 * - Social proof: Implicitamente mostrar que outros usam
 */

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const PERSONA = {
    GREETINGS: [
        'Oi! Transforma suas fotos em algo incrível com IA 🎨\n\n*2 edições grátis pra testar agora.* Manda uma foto e me diz o que quer mudar!',
        'E aí! Aqui você edita fotos com IA em segundos ✨\n\nManda sua foto e pede qualquer coisa: trocar fundo, mudar roupa, virar arte... *Suas 2 primeiras são grátis!*',
        'Bem-vindo! Vou te ajudar a deixar suas fotos do jeito que você imaginou 📸\n\n*Comece grátis agora:* mande uma foto e me diz o que fazer com ela.',
        'Opa! Edição de fotos com IA, fácil e rápido 🚀\n\n*2 edições grátis pra você testar.* Só mandar uma foto e descrever o que quer!',
    ],

    IMAGE_RECEIVED: [
        'Foto recebida! 🤩 Agora me diz: o que vamos criar?\n\n💡 *Ideias:* "fundo em Paris", "roupa social", "estilo cartoon", "remover pessoa"...\n\nÉ só descrever!',
        'Opa, já tô vendo sua foto aqui! 👀 O que você quer fazer com ela?\n\n*Exemplos que funcionam bem:*\n• Trocar o fundo\n• Mudar roupa/acessórios\n• Aplicar filtros artísticos\n• Adicionar/remover elementos\n\nManda aí!',
        'Show! Foto carregada 🖼️ Agora vem a parte divertida...\n\n*Me conta:* que transformação você tá imaginando? (quanto mais detalhe, melhor o resultado!)',
        'Recebi! Essa foto tá com potencial 🔥\n\n*Alguns exemplos do que dá pra fazer:*\n"Mudar fundo pra praia"\n"Colocar óculos de sol"\n"Transformar em pintura"\n\nQual vai ser?',
    ],

    EDITING_START: [
        'Partiu! A IA já tá trabalhando na sua ideia... 🎨✨',
        'Deixa comigo! Criando sua versão em instantes... ⚡',
        'Processando sua edição... isso vai ficar top! 🚀',
        'Aplicando as mudanças... quase lá! 🖌️',
        'Mágica em andamento... ✨ (leva uns 10 segundinhos)',
    ],

    EDITING_SUCCESS: [
        'Pronto! 🎉 O que achou?\n\nSe quiser refinar alguma coisa, só mandar! Tipo: "deixa o fundo mais claro" ou "adiciona óculos".\n\n💡 *Dica:* Você pode editar quantas vezes quiser a mesma foto.',
        'Aqui está! ✨ Ficou do jeito que você imaginou?\n\nSe quiser mudar mais alguma coisa, é só pedir. Ou manda outra foto pra gente transformar!',
        'Tcharam! 🔥 Sua foto editada.\n\n*Gostou?* Continua editando essa ou manda outra!\n*Não ficou perfeito?* Me diz o que ajustar que eu refaço.',
        'Prontinho! 📸 Espero que tenha ficado maneiro.\n\n*Próximos passos:*\n• Quer refinar? Só pedir ajustes\n• Quer desfazer? Digite "desfazer"\n• Quer editar outra? Manda a próxima foto!',
        'Feito! 🎨 Resultado na tela.\n\n*Curtiu?* Compartilha com a galera! 😎\n*Quer melhorar?* Manda mais comandos que eu continuo editando.',
    ],

    EDITING_FAILURE: [
        'Hmm, algo deu errado aqui... 😅\n\nPode tentar de novo? Às vezes reformular o pedido ajuda. Se persistir, me avisa!',
        'Opa, tive um probleminha técnico. 🤔\n\nVamos tentar de novo? Manda o comando novamente que eu refaço.',
        'Eita, não consegui processar dessa vez... 😬\n\nTenta descrever de um jeito diferente? Ou manda a foto de novo se preferir.',
        'Desculpa, a IA se confundiu nessa. 🙈\n\nMe manda o pedido de novo? Prometo caprichar!',
    ],

    AUDIO_RECEIVED: [
        'Ouvi seu áudio! 🎧 Mas pra garantir que eu entenda cada detalhe visual, *escreve pra mim?*\n\nAssim eu não erro nada na edição! 😉',
        'Áudio recebido! 🎤 Só que pra edição de imagem eu preciso que você *escreva* o que quer.\n\nAí fica mais fácil eu processar direitinho!',
        'Opa! Vi que mandou áudio. Mas pra edição funcionar certinho, *manda por texto?*\n\nAí eu consigo aplicar exatamente o que você quer! ✍️',
    ],

    HELP: [
        '*Como funciona:* 🎨\n\n1️⃣ Manda uma foto\n2️⃣ Descreve o que quer mudar\n3️⃣ Recebe a edição em segundos\n\n*Exemplos de pedidos:*\n• "Trocar fundo pra montanha"\n• "Colocar terno azul"\n• "Transformar em desenho anime"\n• "Remover o carro do fundo"\n\n*Comandos úteis:*\n• "Desfazer" - volta uma edição\n• "Reiniciar" - volta pra foto original\n\nBora criar algo incrível?',
        '*Guia rápido:* ⚡\n\n📸 *Mande a foto* que quer editar\n✍️ *Descreva a mudança* (seja específico!)\n✨ *Receba o resultado* em ~10 segundos\n\n*Você pode pedir coisas tipo:*\n→ Mudar cenário/fundo\n→ Alterar roupas/acessórios\n→ Aplicar estilos artísticos\n→ Adicionar/remover objetos\n\n*Não gostou?* Digite "desfazer" ou peça ajustes!\n\nQual foto vamos transformar?',
    ],

    NO_SESSION: [
        'Opa! Preciso de uma foto primeiro 📸\n\nManda a imagem que você quer editar aí!',
        'Ei, ainda não tenho nenhuma foto sua aqui. 🖼️\n\nManda uma pra gente começar a criar!',
        'Antes de editar, preciso da foto! 😉\n\nManda aí que a gente já parte pra ação.',
    ],

    SESSION_EXPIRED: [
        'Opa! Faz um tempo que a gente não conversa... ⏳\n\nManda a foto de novo pra gente retomar?',
        'Sessão expirada! 😅 Mas relaxa, é só mandar a foto novamente que a gente continua.',
        'Eita, nossa conversa anterior já expirou. 📸\n\nManda a foto de novo que eu já te ajudo!',
    ],

    PAYMENT_REQUIRED: [
        'Uau, você arrasou! 🎨 Já usou suas 2 edições grátis e criou imagens incríveis.\n\n✨ Milhares de pessoas continuaram criando por apenas *R$ 0,99*.\n\nQuer desbloquear sua próxima edição?',
        'Que talento! 🤩 Você já dominou o editor com 2 edições grátis.\n\n💡 Por menos que um cafezinho (*R$ 0,99*), você pode:\n• Continuar editando sem limites\n• Criar quantas versões quiser\n• Salvar suas criações favoritas\n\nVamos nessa?',
        'Você descobriu o poder da IA! 🚀 Suas 2 primeiras edições foram só o começo.\n\n🎁 Por *R$ 0,99* você libera:\n→ Mais 1 edição profissional\n→ Mesma qualidade que você já testou\n→ Crédito disponível agora\n\nJá imaginou sua próxima criação?',
        'Adorei editar suas fotos! ✨ Você usou as 2 edições grátis e com certeza tem mais ideias.\n\n💸 Só *R$ 0,99* para não parar agora!\n\nO que mais vamos criar juntos?',
    ],

    PAYMENT_PIX_INTRO: [
        '🎯 Super fácil! Vou te mandar o Pix agora:',
        '💳 Pagamento instantâneo via Pix. Olha só:',
        '⚡ Em 10 segundos você já está criando de novo:',
    ],

    PAYMENT_PIX_CODE: [
        '📋 *OPÇÃO 1:* Copie este código Pix Copia e Cola:',
        '📝 *Jeito 1:* Cole este código no seu banco:',
    ],

    PAYMENT_PIX_QR: [
        '📱 *OPÇÃO 2:* Ou escaneie o QR Code abaixo (mais rápido!):',
        '🔍 *Jeito 2:* Escaneie direto pelo app do seu banco:',
    ],

    PAYMENT_CONFIRMATION_WAIT: [
        '⏱️ Assim que o pagamento cair (geralmente instantâneo), te aviso aqui e você já pode continuar editando!',
        '✅ Pagamento confirmado automaticamente. Aguarde alguns segundos que te aviso!',
        '⚡ Pix confirmado = crédito liberado na hora. Fique de olho aqui!',
    ],

    PAYMENT_SUCCESS: [
        'RECEBIDO! 🎉💸\n\nSeu crédito já está ativo. Agora é só:\n\n1. Mandar sua próxima foto OU\n2. Continuar editando a atual\n\nO que vamos fazer de incrível agora?',
        'CONFIRMADO! ✨ Obrigado pela confiança!\n\n✅ +1 crédito adicionado\n💡 Pronto para criar sem limites\n\nManda a foto ou seu próximo comando!',
        'PAGAMENTO CONFIRMADO! 🚀\n\nVocê faz parte dos criadores que não param no básico. Seu crédito está liberado!\n\nQual sua próxima criação?',
        'CRÉDITO ATIVADO! 💎\n\nAproveita agora que a criatividade está fluindo:\n→ Manda outra foto\n→ Ou edita mais a atual\n\nEstou pronto!',
    ],

    CREDIT_STATUS: [
        'Seu saldo: *{credits} créditos* + *{free} edições grátis* disponíveis 🎨',
        'Você tem *{credits} créditos* e ainda *{free} edições de cortesia* pra usar! ✨',
        'Status: *{credits} créditos pagos* | *{free} gratuitas restantes* 💰',
    ],

    // Mensagem especial na PRIMEIRA edição bem-sucedida
    FIRST_EDIT_COMPLETE: [
        'UAU! Sua primeira edição ficou pronta! 🎉\n\n*Adorou?* Você ainda tem *1 edição grátis*. Aproveita!\n\n💡 *Dica:* Dá pra continuar editando essa mesma foto ou mandar outra.',
        'Primeira transformação concluída! ✨\n\nE aí, curtiu? Você ainda tem *mais 1 edição grátis* pra testar.\n\nManda outro comando ou uma nova foto!',
    ],

    // Última edição grátis (preparar terreno pra conversão)
    SECOND_EDIT_COMPLETE: [
        'Mais uma edição incrível! 🔥\n\n⚠️ Essa foi sua *última edição gratuita*. A próxima custa só R$ 0,99.\n\n*Vale super a pena* - você já viu a qualidade! 😉',
        'Prontinho! Segunda edição feita! 🎨\n\n📢 *Aviso:* Essa foi sua última grátis. Mas relaxa, continuar custa apenas *R$ 0,99*.\n\nQuer fazer mais alguma coisa nessa foto?',
    ],

    // Estimular compartilhamento
    SHARE_PROMPT: [
        'Sua foto ficou INCRÍVEL! 🤩\n\n*Já pensou em postar?* Fica top no perfil! 📸\n\n*Conta pra galera:* Indica esse bot pros amigos que também querem fotos incríveis! 🚀',
    ],

    // Follow-ups de pagamento abandonado
    PAYMENT_ABANDONED_3MIN: [
        'Ei! Vi que você pediu o Pix mas ainda não finalizou. 😊\n\nAlguma dúvida? O código continua válido!\n\n💡 Se preferir, posso gerar outro QR Code.',
    ],

    PAYMENT_ABANDONED_10MIN: [
        'Ainda pensando? 🤔\n\nSem pressão! Se o valor estiver pesado agora, suas edições grátis já mostraram seu talento.\n\nQuando quiser voltar, estarei aqui! 💙',
    ],

    // Oferta de pacote
    PAYMENT_PACKAGE_OFFER: [
        '🎁 VOCÊ MERECE UM PRESENTE!\n\nJá comprou algumas vezes. Que tal um pacote?\n\n*PACOTE CRIATIVO* 🎨\n5 edições por R$ 3,99\n(Você economiza R$ 0,96!)\n\nOu continua comprando de 1 em 1 por R$ 0,99?\n\nResponda:\n1️⃣ = Quero o pacote!\n2️⃣ = Prefiro 1 crédito só',
        'Percebi que você adora criar! 🚀\n\n*OFERTA EXCLUSIVA PRA VOCÊ:*\n\n💎 PACOTE VIP\n→ 5 edições por R$ 3,99\n→ Economia de quase R$ 1,00\n→ Nunca mais ficar travado\n\nOU\n\n💸 1 crédito por R$ 0,99\n\nDigite "pacote" ou "1 crédito"',
    ],

    PAYMENT_PACKAGE_SUCCESS: [
        'PACOTE ATIVADO! 🎉🎨\n\n✅ 5 créditos adicionados\n💪 Agora você pode criar sem preocupação\n\nBora fazer aquele projeto que você estava pensando?\n\nManda a primeira foto!',
    ],

    // Lembrete de créditos baixos
    PAYMENT_LOW_CREDIT_WARNING: [
        '⚠️ *Atenção:* Você tem apenas 1 crédito restante!\n\nDica: Se vai editar bastante hoje, que tal pegar o pacote de 5 por R$ 3,99 e economizar?\n\nDigite "pacote" ou continue normalmente. 😊',
    ],

    // Quando o usuário já pagou antes e acabou de novo
    PAYMENT_RETURNING_USER: [
        'Mais uma rodada? 🎨\n\nVocê já conhece o esquema:\n\n→ 1 crédito: R$ 0,99\n→ 5 créditos: R$ 3,99 (economize!)\n\nQual prefere?',
    ],

    // Erro no pagamento
    PAYMENT_ERROR: [
        'Ops, tive um probleminha técnico aqui. 😅\n\nMas calma! Seus dados estão seguros.\n\nVou tentar de novo. Aguarde 10 segundos...',
        'Eita, algo não funcionou no sistema de pagamento. 🔧\n\nPode tentar novamente? Se o erro persistir, me chama que resolvo!',
    ],
};

export const getGreeting = () => getRandom(PERSONA.GREETINGS);
export const getImageReceived = () => getRandom(PERSONA.IMAGE_RECEIVED);
export const getEditingStart = () => getRandom(PERSONA.EDITING_START);
export const getEditingSuccess = () => getRandom(PERSONA.EDITING_SUCCESS);
export const getEditingFailure = () => getRandom(PERSONA.EDITING_FAILURE);
export const getAudioReceived = () => getRandom(PERSONA.AUDIO_RECEIVED);
export const getHelp = () => getRandom(PERSONA.HELP);
export const getSessionExpired = () => getRandom(PERSONA.SESSION_EXPIRED);
export const getNoSessionMessage = () => getRandom(PERSONA.NO_SESSION);
export const getPaymentRequired = () => getRandom(PERSONA.PAYMENT_REQUIRED);
export const getPaymentSuccess = () => getRandom(PERSONA.PAYMENT_SUCCESS);
export const getCreditStatus = (credits, free) => getRandom(PERSONA.CREDIT_STATUS).replace('{credits}', credits).replace('{free}', free);

// Novas funções
export const getFirstEditComplete = () => getRandom(PERSONA.FIRST_EDIT_COMPLETE);
export const getSecondEditComplete = () => getRandom(PERSONA.SECOND_EDIT_COMPLETE);
export const getSharePrompt = () => getRandom(PERSONA.SHARE_PROMPT);
export const getPaymentPixIntro = () => getRandom(PERSONA.PAYMENT_PIX_INTRO);
export const getPaymentPixCode = () => getRandom(PERSONA.PAYMENT_PIX_CODE);
export const getPaymentPixQR = () => getRandom(PERSONA.PAYMENT_PIX_QR);
export const getPaymentConfirmationWait = () => getRandom(PERSONA.PAYMENT_CONFIRMATION_WAIT);
export const getPaymentAbandoned3Min = () => getRandom(PERSONA.PAYMENT_ABANDONED_3MIN);
export const getPaymentAbandoned10Min = () => getRandom(PERSONA.PAYMENT_ABANDONED_10MIN);
export const getPaymentPackageOffer = () => getRandom(PERSONA.PAYMENT_PACKAGE_OFFER);
export const getPaymentPackageSuccess = () => getRandom(PERSONA.PAYMENT_PACKAGE_SUCCESS);
export const getPaymentLowCreditWarning = () => getRandom(PERSONA.PAYMENT_LOW_CREDIT_WARNING);
export const getPaymentReturningUser = () => getRandom(PERSONA.PAYMENT_RETURNING_USER);
export const getPaymentError = () => getRandom(PERSONA.PAYMENT_ERROR);
