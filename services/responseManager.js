/**
 * Response Manager
 * Centralizes all copy and persona logic for the WhatsApp bot.
 * Provides dynamic variations to make the bot feel less robotic.
 */

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const PERSONA = {
    GREETINGS: [
        'Olá! Bem-vindo ao Creative Studio 🎨. Aqui sua imaginação vira realidade. Já pensou em se ver em Paris, ou vestindo aquele terno impecável? Mande uma foto e vamos criar!',
        'Oi! Sou a IA do Creative Studio ✨. Sabe aquela foto que ficou boa, mas poderia ser *incrível*? Eu resolvo isso. Envie sua foto para começarmos.',
        'E aí! Tudo pronto para transformar suas fotos? 📸 Deixe elas com cara de profissional ou crie cenários fantásticos. Mande sua foto agora!',
    ],

    IMAGE_RECEIVED: [
        'Uau, essa foto tem muito potencial! 🤩 Imagine ela com uma iluminação de cinema ou em um cenário de luxo. O que você manda eu fazer?',
        'Recebi! 🖼️ Agora a mágica acontece. Quer transformar isso em um perfil profissional, ou quem sabe uma aventura radical? Me diga o que você deseja!',
        'Foto carregada! 🚀 Que tal darmos um "up" nela? Posso mudar o fundo, a roupa, ou o estilo. Solte sua criatividade e me diga o que fazer.',
    ],

    EDITING_START: [
        'Iniciando a transformação... 🎨 Preparando os pincéis digitais!',
        'Captando sua ideia... ⏳ Vai ficar show, aguarde um pouquinho.',
        'Criando sua nova versão... ✨ Caprichando nos detalhes para você.',
        'Deixa comigo! 🖌️ Aplicando sua visão artística agora mesmo.',
    ],

    EDITING_SUCCESS: [
        'Prontinho! Olha só essa diferença ✨ O que achou?',
        'Aqui está! Ficou digno de capa de revista, não? 🎨',
        'Resultado pronto! 📸 Se quiser testar outro estilo, é só pedir.',
        'Tcharam! 🎉 Nova versão entregue. O que mais podemos criar hoje?',
    ],

    EDITING_FAILURE: [
        'Ops, tive um probleminha técnico aqui. 😅 A arte é imprevisível às vezes. Pode tentar de novo?',
        'Hmm, algo não saiu como esperado. Vamos tentar mais uma vez para acertar em cheio?',
        'Desculpe, me confundi no processamento. Mande o comando novamente, por favor.',
    ],

    AUDIO_RECEIVED: [
        'Ouvi seu áudio! 🎧 Que ideia legal. Para eu não perder nenhum detalhe, consegue me escrever isso em texto? Assim garanto a perfeição.',
        'Áudio recebido! 🎤 Entendi o conceito. Para confirmar os detalhes visuais, por favor, me mande por escrito.',
    ],

    HELP: [
        'Quer transformar suas fotos? É fácil: 🤔\n\n1. **Envie uma foto** (pode ser selfie, corpo inteiro, o que quiser).\n2. **Diga o desejo**: "Colocar terno azul", "Fundo Nova York", "Estilo Cyberpunk".\n3. **Pronto!** Eu crio a imagem.\n\n💡 *Dica: Seja criativo! Você pode mudar roupas, cenários, iluminação e muito mais.*',
        'Funciona assim: Foto ➡️ Pedido ➡️ Mágica ✨.\n\nExemplos para te inspirar:\n- "Me coloque em um escritório de luxo"\n- "Mudar roupa para vestido de gala"\n- "Transformar em desenho 3D da Pixar"\n\nVamos tentar?',
    ],

    UNKNOWN_COMMAND: [
        'Não entendi muito bem. 🧐 Tente descrever o que você quer *ver* na imagem. Ex: "Adicionar óculos", "Mudar fundo".',
        'Hmm, ficou confuso. Tente ser direto: "Colocar [objeto]", "Mudar para [lugar]". Vamos lá!',
    ],

    SESSION_EXPIRED: [
        'Nossa sessão expirou. ⏳ Mas a criatividade não para! Mande uma nova foto para começarmos um novo projeto incrível.',
        'Faz tempo que não nos falamos! Que tal criar algo novo? Mande uma foto para retomar as edições. 📸',
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
    title: 'Menu Criativo',
    buttons: [
        { id: 'ideas', text: '💡 Inspirações' },
        { id: 'reset', text: '🔄 Nova Foto' },
        { id: 'help', text: '❓ Como funciona' }
    ]
});

export const getEditOptions = () => ({
    title: 'E agora?',
    buttons: [
        { id: 'undo', text: '↩️ Desfazer' },
        { id: 'reset', text: '🆕 Nova Foto' },
        { id: 'variations', text: '✨ Mais Variações' }
    ]
});
