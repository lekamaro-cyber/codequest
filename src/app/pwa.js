// Installation sur le téléphone (application web installable) et fonctionnement hors connexion.
// Actif seulement sur la version publiée (GitHub Pages) : la page contient alors un manifeste.
(function (App) {
  var ui = App.ui, h = ui.h;
  var deferred = null;
  var ua = navigator.userAgent || '';
  var hasManifest = !!document.querySelector('link[rel="manifest"]');
  var DISMISS = 'codequest.install-later';

  function standalone() {
    return (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) || navigator.standalone === true;
  }
  var P = App.pwa = {
    url: 'https://lekamaro-cyber.github.io/codequest/',
    available: hasManifest && /^https?:$/.test(location.protocol),
    isIOS: /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isAndroid: /Android/i.test(ua),
    isMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && window.innerWidth < 900),
    offline: false,
    installed: standalone,
    canPrompt: function () { return !!deferred; },
    prompt: function () {
      if (!deferred) { P.showHelp(); return Promise.resolve(false); }
      var d = deferred;
      deferred = null;
      d.prompt();
      return d.userChoice.then(function (c) { App.emit('pwa'); return !!(c && c.outcome === 'accepted'); }, function () { return false; });
    },
    dismissed: function () { try { return localStorage.getItem(DISMISS) === '1'; } catch (e) { return false; } },
    dismiss: function () { try { localStorage.setItem(DISMISS, '1'); } catch (e) {} App.emit('pwa'); }
  };

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; App.emit('pwa'); });
  window.addEventListener('appinstalled', function () {
    deferred = null;
    ui.toast({ icon: 'check', title: 'CodeQuest est installée', text: 'Tu la retrouves avec tes applications, même hors connexion.' });
    App.emit('pwa');
  });

  if (P.available && 'serviceWorker' in navigator) {
    var register = function () {
      navigator.serviceWorker.register('sw.js').then(function () { P.offline = true; App.emit('pwa'); }, function () {});
    };
    if (document.readyState === 'complete') register(); else window.addEventListener('load', register);
  }

  function steps(list) { return h('ol', { class: 'install-steps' }, list.map(function (s) { return h('li', { html: ui.md(s).replace(/<\/?p>/g, '') }); })); }

  // Explications pas à pas, selon le téléphone.
  P.showHelp = function () {
    var android = steps([
      'Ouvre CodeQuest dans **Chrome** : ' + P.url,
      'Touche le menu **⋮** en haut à droite.',
      'Choisis **Installer l’application** (ou **Ajouter à l’écran d’accueil**), puis **Installer**.',
      'L’icône CodeQuest apparaît avec tes applications : elle s’ouvre en plein écran, même sans connexion.'
    ]);
    var ios = steps([
      'Ouvre CodeQuest dans **Safari** : ' + P.url,
      'Touche le bouton **Partager** (le carré avec une flèche vers le haut).',
      'Choisis **Sur l’écran d’accueil**, puis **Ajouter**.',
      'Sur iPhone, l’appli installée a sa propre mémoire : si tu as déjà progressé dans Safari, exporte ta progression (Profil) puis importe-la dans l’appli.'
    ]);
    var close = ui.modal(h('div', { class: 'stack' },
      h('h2', null, 'Installer CodeQuest sur ton téléphone'),
      P.isIOS ? null : h('div', { class: 'stack', style: { gap: '6px' } }, h('div', { class: 'label' }, 'Android (Chrome)'), android),
      P.isAndroid ? null : h('div', { class: 'stack', style: { gap: '6px' } }, h('div', { class: 'label' }, 'iPhone et iPad (Safari)'), ios),
      h('p', { class: 'small muted' }, 'Aucune boutique d’applications ni compte nécessaire. L’appli se met à jour toute seule quand tu es connecté.'),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
        h('button', { class: 'btn', onclick: function (e) { ui.copyText(P.url).then(function (ok) { e.target.textContent = ok ? 'Lien copié' : P.url; }); } }, ui.icon('copy'), 'Copier le lien'),
        h('button', { class: 'btn btn-primary', onclick: function () { close(); } }, 'Compris'))), { label: 'Installer CodeQuest' });
  };

  // Bandeau de l'accueil : proposé sur téléphone tant que l'appli n'est pas installée.
  P.banner = function () {
    if (!P.available || standalone() || P.dismissed()) return null;
    if (!P.isMobile && !deferred) return null;
    return h('div', { class: 'install-banner' },
      h('img', { src: 'icons/icon-192.png', alt: '', width: '48', height: '48' }),
      h('div', { class: 'install-text' },
        h('div', { style: { fontWeight: 650 } }, 'Installe CodeQuest sur ton téléphone'),
        h('div', { class: 'small muted' }, 'Une icône sur ton écran d’accueil, le plein écran, et ça marche même hors connexion.')),
      h('div', { class: 'install-actions' },
        h('button', { class: 'btn btn-ghost btn-sm', onclick: P.dismiss }, 'Plus tard'),
        h('button', { class: 'btn btn-primary btn-sm', onclick: function () { P.prompt(); } }, ui.icon('download'), deferred ? 'Installer' : 'Comment faire')));
  };

  // Carte du profil : état de l'installation et bouton.
  P.card = function () {
    var body;
    if (standalone()) {
      body = h('div', { class: 'notice ok' }, ui.icon('check'), h('div', null, h('strong', null, 'CodeQuest est installée sur cet appareil.'), h('div', { class: 'small' }, P.offline ? 'Elle fonctionne aussi hors connexion.' : 'Elle se met à jour toute seule quand tu es connecté.')));
    } else if (P.available) {
      body = h('div', { class: 'stack' },
        h('p', { class: 'small muted' }, 'Installe CodeQuest comme une application : icône sur l’écran d’accueil, plein écran, fonctionnement hors connexion' + (P.offline ? ' (déjà prêt sur cet appareil)' : '') + '.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn btn-primary', onclick: function () { P.prompt(); } }, ui.icon('download'), deferred ? 'Installer CodeQuest' : 'Comment l’installer')));
    } else {
      body = h('div', { class: 'stack' },
        h('p', { class: 'small muted' }, 'Cette version s’affiche dans Claude. Pour installer CodeQuest sur ton téléphone, ouvre la version publiée dans ton navigateur :'),
        h('div', { class: 'row' }, h('code', { class: 'inline-code', style: { userSelect: 'all' } }, P.url),
          h('button', { class: 'btn btn-sm', onclick: P.showHelp }, 'Comment faire')));
    }
    return h('div', { class: 'card stack' }, h('h2', null, 'Application sur ton téléphone'), body);
  };
})(App);
