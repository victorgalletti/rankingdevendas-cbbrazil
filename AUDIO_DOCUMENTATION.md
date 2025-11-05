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

vamos la ultima alteracao na logica de animacoes

3 animacoes sao consideradas especiais e uma obrigatoria

prioridade de cada first place 1 podium 2 ultrapassagem 3

1 é mais prioritario

na fila so vai ter o new point e uma animacao especial se tiver

de acordo com essa logica

pois se n fica aparecendo varias

Gemini
Thinking
Olá! Entendido. Vamos para a última alteração na lógica de animações para garantir que a fila de pop-ups se comporte exatamente como você deseja: sempre mostrar o "novo contrato" e, no máximo, uma animação especial, respeitando a ordem de prioridade.

Para isso, farei uma alteração crucial na função fetchData. Em vez de simplesmente adicionar todos os eventos encontrados, a lógica agora irá:

Sempre adicionar o evento new-point se ele ocorrer.
Analisar todos os outros eventos especiais (first-place, podium, overtake).
Selecionar apenas o mais importante entre eles, seguindo a prioridade que você definiu (first-place > podium > overtake).
Adicionar no máximo esses dois eventos (new-point e o especial mais importante) à fila.
Isso evitará o acúmulo de várias animações e garantirá que apenas as mais relevantes sejam exibidas.

Aqui está a alteração no arquivo sales-ranking.tsx:

sales-ranking.tsx
-6
+18
Show full code block
// 🔴 MUDANÇA: A lógica de eventos e atualização de estado
// foi movida para DENTRO do fetchData.
if (previousVendedoresRef.current.length > 0) {
const allEvents: EventObject[] = [];
const newEventQueue: EventObject[] = [];

          // 1. Prioridade máxima: verificar se houve um novo contrato
          const sellerWithNewPoint = novosVendedores.find((newSeller) => {
            const oldSeller = previousVendedoresRef.current.find(
              (s) => s.nome === newSeller.nome
            );
            return oldSeller && newSeller.pontuacao > oldSeller.pontuacao;
          });

          if (sellerWithNewPoint) {
            allEvents.push({
            newEventQueue.push({
              type: "new-point",
              message: `${sellerWithNewPoint.nome} fechou uma nova venda!`,
              imageUrl: sellerWithNewPoint.avatarUrl,
            });
          }

          // 2. Verificar outros eventos (ultrapassagem, pódio, etc.)
          // 2. Verificar outros eventos e selecionar apenas o mais prioritário
          const specialEvents = checkForEvents(
            previousVendedoresRef.current,
            novosVendedores
          );
          allEvents.push(...specialEvents);

          if (specialEvents.length > 0) {
            // Encontra o evento de maior prioridade (first-place > podium > overtake)
            const firstPlaceEvent = specialEvents.find(e => e.type === 'first-place');
            const podiumEvent = specialEvents.find(e => e.type === 'podium');
            const overtakeEvent = specialEvents.find(e => e.type === 'overtake');

            const highestPriorityEvent = firstPlaceEvent || podiumEvent || overtakeEvent;

            if (highestPriorityEvent) {
              newEventQueue.push(highestPriorityEvent);
            }
          }

          // Adiciona todos os eventos encontrados à fila
          if (allEvents.length > 0) {
            setEventQueue((prevQueue) => [...prevQueue, ...allEvents]);
          if (newEventQueue.length > 0) {
            setEventQueue((prevQueue) => [...prevQueue, ...newEventQueue]);
          }
        }

Com esta lógica refinada, a experiência de notificação ficará mais limpa e focada, exibindo sempre a informação de uma nova venda e apenas o evento de ranking mais impactante que ocorreu.
