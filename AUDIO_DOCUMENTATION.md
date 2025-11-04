# Gerenciamento de Áudio e Política de Autoplay

Este documento explica a implementação para lidar com a política de autoplay dos navegadores modernos, que impede a reprodução automática de áudio sem uma interação prévia do usuário.

## 1. O Problema: Bloqueio de Autoplay pelo Navegador

Navegadores como Chrome, Firefox e Safari bloqueiam a reprodução de áudio (`audio.play()`) se ela for iniciada antes que o usuário tenha interagido com a página (por exemplo, clicando em um botão ou em qualquer lugar do documento).

Quando nosso sistema tenta tocar um som de notificação (como "Nova Venda!") logo após o carregamento da página ou via uma atualização em tempo real do Supabase, o navegador intervém e gera o seguinte erro no console:

```
NotAllowedError: play() failed because the user didn't interact with the document first.
```

Isso impede que os sons das notificações sejam reproduzidos, prejudicando a experiência do usuário.

## 2. A Solução: Desbloqueio com Interação do Usuário

Para contornar essa restrição de forma elegante, implementamos um mecanismo que "desbloqueia" a capacidade de tocar áudio após a primeira interação do usuário com a página.

### Passo 1: Criar um Estado de Controle

Primeiro, adicionamos um estado booleano ao componente `SalesRanking` para rastrear se o áudio já foi desbloqueado.

```typescript
// c:\Privado\rankindevendas-cbbrazil\sales-ranking.tsx

const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
```

### Passo 2: Adicionar um Event Listener Global

Em seguida, usamos um `useEffect` para registrar um ouvinte de eventos de `click` no objeto `window`. Este ouvinte será acionado na primeira vez que o usuário clicar em _qualquer lugar_ da página.

Quando o clique ocorre, a função `unlockAudio`:

1.  Define o estado `isAudioUnlocked` como `true`.
2.  Remove o próprio ouvinte de eventos para evitar execuções desnecessárias em cliques futuros.

```typescript
// c:\Privado\rankindevendas-cbbrazil\sales-ranking.tsx

useEffect(() => {
  const unlockAudio = () => {
    setIsAudioUnlocked(true);
    window.removeEventListener("click", unlockAudio);
  };

  window.addEventListener("click", unlockAudio);

  return () => window.removeEventListener("click", unlockAudio);
}, []);
```

### Passo 3: Condicionar a Reprodução do Áudio

Finalmente, modificamos o `useEffect` responsável por disparar os sons. Agora, ele só define um `audioPlayRequest` se a `eventQueue` tiver um evento **E** se o estado `isAudioUnlocked` for `true`.

```typescript
// c:\Privado\rankindevendas-cbbrazil\sales-ranking.tsx

useEffect(() => {
  if (eventQueue.length > 0 && isAudioUnlocked) {
    setAudioPlayRequest(eventQueue.type);
  }
}, [eventQueue, isAudioUnlocked]);
```

Com essa abordagem, o sistema aguarda a primeira interação do usuário para "ganhar permissão" e, a partir desse momento, todas as notificações sonoras funcionarão como esperado, sem erros no console.
