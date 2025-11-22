/**
 * Response Manager
 * Centralizes all copy and persona logic for the WhatsApp bot.
 * Provides dynamic variations to make the bot feel less robotic.
 */

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const PERSONA = {
    GREETINGS: [
        'Olá! Bem-vindo ao Creative Studio 🎨. Aqui sua imaginação vira realidade. Mande uma foto para começarmos!',
        'Oi! Sou a IA do Creative Studio ✨. Envie uma foto e me diga o que quer mudar nela.',
        'E aí! Tudo pronto para transformar suas fotos? 📸 Mande sua foto agora!',
    ],

    IMAGE_RECEIVED: [
        'Recebi sua foto! 🤩 Agora é só me dizer o que você quer fazer com ela. (Ex: "Mudar fundo para Paris", "Colocar terno", "Estilo Cyberpunk")',
        'Foto carregada! 🖼️ O que vamos criar hoje? Pode pedir qualquer coisa!',
        'Show! 🚀 Agora me diz: qual é a sua ideia para essa imagem?',
    ],

    EDITING_START: [
        'Deixa comigo, estou fazendo sua mágica... 🎨',
        'Um momento, estou aplicando sua ideia... ⏳',
        'Criando sua nova versão... ✨',
        'Trabalhando nisso! 🖌️',
    ],

    EDITING_SUCCESS: [
        'Prontinho! O que achou? Se quiser mudar mais alguma coisa, é só pedir. ✨',
        'Aqui está! Se quiser continuar editando essa mesma foto, só mandar o próximo comando. 🎨',
        'Resultado pronto! 📸 Quer adicionar mais algum detalhe?',
        'Tcharam! 🎉 Se quiser desfazer, é só digitar "desfazer". O que mais vamos fazer?',
    ],

    EDITING_FAILURE: [
        'Ops, tive um probleminha técnico aqui. 😅 Pode tentar pedir de novo?',
        'Hmm, algo não saiu como esperado. Tenta reformular seu pedido?',
        'Desculpe, me confundi. Mande o comando novamente, por favor.',
    ],

    AUDIO_RECEIVED: [
        'Ouvi seu áudio! 🎧 Mas para garantir que eu entenda cada detalhe visual, prefiro que você escreva o que deseja.',
        'Áudio recebido! 🎤 Por favor, me mande o pedido por escrito para eu não errar nada.',
    ],

    HELP: [
        'É super simples: \n\n1. **Mande uma foto**.\n2. **Peça o que quiser**: "Colocar óculos", "Mudar fundo", "Virar desenho".\n3. **Continue editando**: Mande mais pedidos para a mesma foto.\n\nComandos úteis:\n- "Desfazer": Volta uma edição.\n- "Reiniciar": Volta para a foto original.',
        'Aqui você manda! 🎨\n\n- Envie uma foto e diga o que fazer.\n- Se não gostar, digite "Desfazer".\n- Se quiser começar do zero, digite "Reiniciar".\n\nO que vamos criar?',
    ],

    NO_SESSION: [
        'Preciso de uma foto primeiro! 📸 Mande a imagem que você quer editar.',
        'Ainda não tenho nenhuma foto sua aqui. Mande uma para começarmos! 🖼️',
        'Opa! Mande uma foto antes de pedir a edição. 😉',
    ],

    SESSION_EXPIRED: [
        'Nossa sessão expirou. ⏳ Mande a foto novamente para começarmos de novo.',
        'Faz tempo que não nos falamos! Mande a foto de novo para retomar. 📸',
    ],

    PAYMENT_REQUIRED: [
        'Você usou suas edições gratuitas! 🎨 Para continuar criando imagens incríveis, adquira mais créditos por apenas R$ 0,99.',
        'Opa! Suas edições grátis acabaram. Mas não pare por aqui! Por R$ 0,99 você libera mais uma edição.',
        'Quer continuar editando? 🚀 Adquira um crédito por R$ 0,99 e solte a imaginação!',
    ],

    PAYMENT_SUCCESS: [
        'Pagamento confirmado! 🎉 Crédito adicionado. Pode mandar sua foto ou continuar editando!',
        'Recebi seu pagamento! 💸 Você já pode fazer sua próxima edição incrível.',
        'Tudo certo! Crédito liberado. 🎨 Vamos criar?',
    ],

    CREDIT_STATUS: [
        'Você ainda tem {credits} créditos e {free} edições gratuitas.',
        'Saldo: {credits} créditos. Edições grátis restantes: {free}.',
    ]
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
