/**
 * Response Manager
 * Centralizes all copy and persona logic for the WhatsApp bot.
 * Provides dynamic variations to make the bot feel less robotic.
 */

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const PERSONA = {
    GREETINGS: [
        'Olá! Bem-vindo ao Creative Studio 🎨. Sou sua assistente de edição de fotos. Mande uma imagem e vamos criar algo incrível!',
        'Oi! Aqui é a IA do Creative Studio ✨. Estou pronta para transformar suas fotos. Pode me enviar uma para começar?',
        'E aí! Tudo pronto para editar? 📸 Mande sua foto e me diga o que você imagina.',
    ],

    IMAGE_RECEIVED: [
        'Recebi sua foto! 🖼️ O que vamos fazer com ela? Me diga o que mudar ou escolha uma opção abaixo.',
        'Foto carregada com sucesso! 🚀 Agora é com você: descreva a edição ou veja algumas ideias.',
        'Ótima foto! 🤩 Estou pronta. O que você quer alterar nela?',
    ],

    EDITING_START: [
        'Iniciando a edição... 🎨 Segura aí!',
        'Processando seu pedido... ⏳ Já te mostro o resultado.',
        'Criando sua nova versão... ✨ Só um instante.',
        'Deixa comigo! 🖌️ Aplicando sua ideia agora.',
    ],

    EDITING_SUCCESS: [
        'Prontinho! O que achou? ✨',
        'Aqui está! Ficou como você imaginava? 🎨',
        'Resultado pronto! 📸 Se quiser mudar mais alguma coisa, é só pedir.',
        'Tcharam! 🎉 Nova versão entregue.',
    ],

    EDITING_FAILURE: [
        'Ops, tive um probleminha técnico aqui. 😅 Pode tentar de novo em alguns instantes?',
        'Hmm, algo não saiu como esperado. Tente enviar o comando novamente.',
        'Desculpe, me confundi no processamento. Vamos tentar mais uma vez?',
    ],

    AUDIO_RECEIVED: [
        'Ouvi seu áudio! 🎧 Entendi. Se quiser aplicar isso na foto, pode confirmar em texto?',
        'Áudio recebido! 🎤 Para garantir que eu faça exatamente o que você quer, prefiro que me mande por escrito, pode ser?',
    ],

    HELP: [
        'Precisa de ajuda? 🤔\n\n1. Envie uma foto.\n2. Digite o que quer mudar (ex: "colocar terno", "fundo praia").\n3. Eu gero a imagem.\n4. Se não gostar, pode pedir "desfazer" ou mandar outra instrução para ajustar.',
        'É simples: Foto ➡️ Pedido ➡️ Edição ✨.\n\nVocê pode pedir coisas como:\n- "Mudar fundo para Paris"\n- "Colocar óculos de sol"\n- "Transformar em desenho 3D"',
    ],

    UNKNOWN_COMMAND: [
        'Não entendi muito bem. 🧐 Se for uma edição, tente descrever com outras palavras.',
        'Hmm, não captei. Tente ser mais direto, tipo: "adicionar chapéu" ou "remover fundo".',
    ],

    SESSION_EXPIRED: [
        'Nossa sessão anterior expirou. ⏳ Mande a foto novamente para começarmos um novo projeto!',
        'Faz tempo que não nos falamos! Mande uma nova foto para retomar as edições. 📸',
    ]
};

export const getGreeting = () => getRandom(PERSONA.GREETINGS);
export const getImageReceived = () => getRandom(PERSONA.IMAGE_RECEIVED);
export const getEditingStart = () => getRandom(PERSONA.EDITING_START);
export const getEditingSuccess = () => getRandom(PERSONA.EDITING_SUCCESS);
export const getEditingFailure = () => getRandom(PERSONA.EDITING_FAILURE);
export const getAudioReceived = () => getRandom(PERSONA.AUDIO_RECEIVED);
export const getHelp = () => getRandom(PERSONA.HELP);
export const getUnknownCommand = () => getRandom(PERSONA.UNKNOWN_COMMAND);
export const getSessionExpired = () => getRandom(PERSONA.SESSION_EXPIRED);

export const getMenuOptions = () => ({
    title: 'Menu Rápido',
    buttons: [
        { id: 'ideas', text: '💡 Ideias' },
        { id: 'reset', text: '🔄 Reiniciar' },
        { id: 'help', text: '❓ Ajuda' }
    ]
});

export const getEditOptions = () => ({
    title: 'O que fazer agora?',
    buttons: [
        { id: 'undo', text: '↩️ Desfazer' },
        { id: 'reset', text: '🆕 Nova Foto' },
        { id: 'variations', text: '✨ Variação' }
    ]
});
