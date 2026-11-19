(function (window) {
  'use strict';

  if (window.location.origin !== 'https://pjh-eric.github.io') return;
  const game = window.location.pathname.split('/')[1];
  const query = new URLSearchParams(window.location.search);
  // Explicit test URLs remain direct connections.
  if (query.has('server')) return;

  const settings = {
    'flip-match': ['flip-match-sg', '/', true],
    'guess-ab': ['guess-ab', '/ws', true],
    'angel-strategy': ['angel-strategy-server', '/ws', true],
    'amaze-go': ['amaze-go-server', '/ws', true],
    'fruit-link': ['fruit-link-sg', '/socket.io/', true],
    'draw-guess': ['draw-guess-sg', '/socket.io/', true],
    'pool-duel': ['pool-duel', '/ws', true],
    'house-stack': ['house-stack-server', '/socket.io/'],
    'whack-a-mole': ['whack-a-mole-sg', '/socket.io/'],
    'stair-kids': ['stair-kids-sg', '/ws'],
    'maze-roll': ['maze-roll-server', '/ws'],
    'snake-3d': ['snake-3d-server', '/ws'],
    'bumper-sumo': ['bumper-sumo-83kf', '/socket.io/'],
    'curling-duel': ['ice-duel-server', '/', false, 'curling-duel']
  };

  const config = settings[game];
  if (!config) return;
  const [renderName, path, cloudflareFirst, workerName = game + '-backup'] = config;
  const websocketPath = path === '/socket.io/' ? path + '?EIO=4&transport=websocket' : path;
  const cloudflare = {
    id: 'cloudflare', url: 'https://' + workerName + '.eric-games.workers.dev',
    websocketPath, timeoutMs: 5000
  };
  const render = {
    id: 'render', url: 'https://' + renderName + '.onrender.com',
    websocketPath, timeoutMs: 12000
  };
  const route = window.createBackendRouter({
    primary: cloudflareFirst ? cloudflare : render,
    standby: cloudflareFirst ? render : cloudflare,
    pin: query.get('backend')
  });
  const hosts = new Set([new URL(cloudflare.url).host, new URL(render.url).host]);
  const NativeSocket = window.WebSocket;

  function manages(address) {
    if (!address) return false;
    try { return hosts.has(new URL(address).host); } catch { return false; }
  }

  class RoutedSocket extends EventTarget {
    connecting = true;
    socket = null;

    constructor(address) {
      super();
      this.url = address;
      void this.open(address);
    }

    get readyState() {
      return this.socket?.readyState ?? (this.connecting ? NativeSocket.CONNECTING : NativeSocket.CLOSED);
    }

    notify(event) {
      this.dispatchEvent(event);
      this['on' + event.type]?.call(this, event);
    }

    async open(address) {
      try {
        const selected = await route.select();
        if (!this.connecting) return;
        if (!selected) throw new Error('No available game backend');
        const url = new URL(address);
        url.host = new URL(selected).host;
        this.socket = new NativeSocket(url);
        this.url = url.href;
        this.socket.addEventListener('open', () => this.notify(new Event('open')));
        this.socket.addEventListener('message', event => this.notify(new MessageEvent('message', { data: event.data })));
        this.socket.addEventListener('error', () => this.notify(new Event('error')));
        this.socket.addEventListener('close', event => this.notify(new CloseEvent('close', {
          code: event.code, reason: event.reason, wasClean: event.wasClean
        })));
      } catch {
        this.connecting = false;
        this.notify(new Event('error'));
        this.notify(new CloseEvent('close', { code: 1006 }));
      }
    }

    send(data) { this.socket.send(data); }

    close(code, reason) {
      if (this.socket) this.socket.close(code, reason);
      else this.connecting = false;
    }
  }

  window.GameBackend = {
    canRoute: manages,
    async select(address) {
      if (!manages(address)) return address;
      const selected = await route.select();
      if (!selected) throw new Error('No available game backend');
      return selected;
    },
    createSocket(address) {
      return manages(address) ? new RoutedSocket(address) : new NativeSocket(address);
    },
    pinInvite(address) {
      return route.pinInvite(new URL(address, window.location.href)).toString();
    }
  };
})(window);
