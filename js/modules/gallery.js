/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/gallery.js
   Photo gallery organised by album: meetings, training, competitions,
   projects, events, awards and team photos.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  function nameOf(id) {
    var m = Store.find('members', id);
    return m ? m.fullName : (id || '—');
  }
  function photosOf(albumId) { return Store.where('gallery', function (p) { return p.albumId === albumId; }); }
  function albumImage(p) {
    if (p && p.placeholder) return '<img src="' + U.attr(p.placeholder) + '" alt="' + U.attr(p.title || 'Photo placeholder') + '">';
    return '<span class="ph-blank">' + Icons.svg('image') + '</span>';
  }

  /* ══ Album form ═══════════════════════════════════════════════════════ */
  function openAlbumForm(album) {
    var editing = !!album;
    UI.formModal({
      title: editing ? 'Edit album' : 'Create album',
      subtitle: editing ? album.name : 'Group photos from one club event or activity',
      icon: 'folder', size: 'sm',
      formHtml: Forms.render([
        { name: 'name', label: 'Album name', type: 'text', required: true, colSpan: 2, value: editing ? album.name : '', placeholder: 'e.g. Term 3 General Meeting' },
        { name: 'category', label: 'Category', type: 'select', required: true, options: Data.GALLERY_CATEGORIES, value: editing ? album.category : 'Meetings' },
        { name: 'date', label: 'Date', type: 'date', required: true, value: editing ? album.date : U.todayISO() },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: 2, rows: 3, value: editing ? album.description : '' }
      ]),
      submitLabel: editing ? 'Save album' : 'Create album',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (data) {
        if (editing) Store.update('albums', album.id, data);
        else Store.insert('albums', Object.assign({ demo: false, coverFileId: null }, data, { createdBy: Auth.currentUser() ? Auth.currentUser().id : null }));
        UI.toast(editing ? 'Album updated' : 'Album created', '“' + data.name + '” is ready for photos.', 'success');
        Router.refresh();
      }
    });
  }

  /* ══ Photo form (placeholder or uploaded file) ════════════════════════ */
  function openPhotoForm(album, photo) {
    var editing = !!photo;
    UI.formModal({
      title: editing ? 'Edit photo' : 'Add photo',
      subtitle: album.name, icon: 'image', size: 'sm',
      formHtml: Forms.render([
        { name: 'title', label: 'Photo title', type: 'text', required: true, colSpan: 2, value: editing ? photo.title : '' },
        { name: 'date', label: 'Date taken', type: 'date', required: true, value: editing ? photo.date : album.date },
        { name: 'albumId', label: 'Album', type: 'select', required: true, options: Store.all('albums').map(function (a) { return { value: a.id, label: a.name }; }), value: editing ? photo.albumId : album.id },
        { name: 'file', label: 'Photo file', type: 'file', accept: 'image/*', colSpan: 2, help: 'Optional. JPG or PNG up to about 2 MB — stored in the browser.' },
        { name: 'caption', label: 'Caption', type: 'textarea', colSpan: 2, rows: 3, value: editing ? photo.caption : '' }
      ]),
      submitLabel: editing ? 'Save photo' : 'Add photo',
      onOpen: function (c, form) { Forms.init(form); Forms.bindImageUpload(form); },
      onSubmit: function (data) {
        var payload = {
          title: data.title, date: data.date, albumId: data.albumId, caption: data.caption,
          category: (Store.find('albums', data.albumId) || album).category,
          fileId: editing ? photo.fileId : null,
          placeholder: editing ? photo.placeholder : (data.title ? Data.placeholder(data.title, Date.now() % 999, 'IMG') : null),
          demo: editing ? photo.demo : false,
          uploadedBy: Auth.currentUser() ? Auth.currentUser().id : null
        };
        if (editing) Store.update('gallery', photo.id, payload);
        else Store.insert('gallery', payload);
        UI.toast(editing ? 'Photo updated' : 'Photo added', '“' + data.title + '” was added to ' + album.name + '.', 'success');
        Router.refresh();
      }
    });
  }

  /* ══ Lightbox ═════════════════════════════════════════════════════════ */
  function openLightbox(album, photo) {
    var list = photosOf(album.id);
    var idx = list.indexOf(photo);
    var ctrl = UI.modal({
      title: photo.title, subtitle: album.name + ' · ' + U.fmtDate(photo.date, 'long'),
      icon: 'image', size: 'lg',
      body: '<div class="lightbox-stage" data-lb-stage>' + albumImage(photo) + '</div>' +
        '<div class="flex between center mt-2"><button type="button" class="btn btn-outline btn-sm" data-lb-prev>' + Icons.svg('chevron-left', { class: 'btn-ico' }) + 'Previous</button>' +
        '<span class="muted small" data-lb-count>' + (idx + 1) + ' of ' + list.length + '</span>' +
        '<button type="button" class="btn btn-outline btn-sm" data-lb-next>Next' + Icons.svg('chevron-right', { class: 'btn-ico' }) + '</button></div>' +
        '<p class="small mt-2">' + U.esc(photo.caption || 'No caption recorded.') + '</p>' +
        '<p class="muted xs">' + Icons.svg('info') + ' Demo image placeholder — real photographs will appear here once media storage is connected.</p>',
      actions: [
        { label: 'Close', tone: 'ghost', onClick: function (c) { c.close(); } },
        (Auth.can('gallery', 'delete') ? { label: 'Delete', tone: 'danger-outline', icon: 'trash', onClick: function (c) {
            c.close();
            CRUD.remove({
              module: 'gallery', collection: 'gallery', id: photo.id, label: 'this photo',
              title: 'Delete photo', details: 'The photo will be removed from the album. You can undo this immediately.',
              after: function () { Router.refresh(); }
            });
          } } : null)
      ].filter(Boolean)
    });
    function show(target) {
      var i = list.indexOf(target);
      ctrl.modal.querySelector('[data-lb-stage]').innerHTML = albumImage(target);
      ctrl.modal.querySelector('[data-lb-count]').textContent = (i + 1) + ' of ' + list.length;
      ctrl.modal.querySelector('.modal-title').textContent = target.title;
      ctrl.modal.querySelector('[data-lb-stage]').setAttribute('data-id', target.id);
    }
    ctrl.modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-prev]')) { idx = (idx - 1 + list.length) % list.length; show(list[idx]); }
      if (e.target.closest('[data-lb-next]')) { idx = (idx + 1) % list.length; show(list[idx]); }
    });
    ctrl.modal.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { idx = (idx - 1 + list.length) % list.length; show(list[idx]); }
      if (e.key === 'ArrowRight') { idx = (idx + 1) % list.length; show(list[idx]); }
    });
    return ctrl;
  }

  /* ══ List page ════════════════════════════════════════════════════════ */
  var state = { category: '', albumId: '', mode: 'albums' };

  function albumCard(album) {
    var photos = photosOf(album.id);
    return '<article class="gallery-album" data-album="' + album.id + '">' +
      '<div class="gallery-cover">' + (photos[0] ? albumImage(photos[0]) : '<span class="ph-blank">' + Icons.svg('folder') + '</span>') +
        '<span class="gc-count">' + photos.length + ' photo' + (photos.length === 1 ? '' : 's') + '</span></div>' +
      '<div class="ga-body"><h3><a href="#/gallery/' + album.id + '">' + U.esc(album.name) + '</a></h3>' +
      '<p class="small muted">' + U.esc(U.truncate(album.description || '', 90)) + '</p>' +
      '<div class="flex between center wrap gap-1">' + UI.badge(album.category, 'secondary', { icon: 'folder' }) +
        '<span class="muted xs">' + U.fmtDate(album.date) + '</span></div></div></article>';
  }

  function albumsView() {
    var albums = Store.all('albums').filter(function (a) { return !state.category || a.category === state.category; });
    albums = U.sortBy(albums, 'date', 'desc');
    if (!albums.length) {
      return UI.card({
        body: UI.emptyState({
          icon: 'folder', title: 'No albums yet',
          message: 'Create an album to collect photos from club meetings, training and events.',
          actions: Auth.can('gallery', 'create') ? '<button type="button" class="btn btn-primary" data-gal="new-album">' + Icons.svg('plus', { class: 'btn-ico' }) + 'Create album</button>' : ''
        })
      });
    }
    return '<div class="gallery-grid">' + albums.map(albumCard).join('') + '</div>';
  }

  function photosView(album) {
    var photos = photosOf(album.id);
    if (state.albumId && album.id !== state.albumId) return '';
    return UI.card({
      title: album.name, icon: 'image', sub: photos.length + ' photos · ' + U.fmtDate(album.date, 'long'),
      head: '<div class="card-tools">' +
        (Auth.can('gallery', 'create') ? '<button type="button" class="btn btn-primary btn-sm" data-gal="new-photo" data-album="' + album.id + '">' + Icons.svg('plus', { class: 'btn-ico' }) + 'Add photo</button>' : '') +
        (Auth.can('gallery', 'edit') ? '<button type="button" class="btn btn-outline btn-sm" data-gal="edit-album" data-album="' + album.id + '">' + Icons.svg('edit', { class: 'btn-ico' }) + 'Edit album</button>' : '') +
      '</div>',
      body: photos.length
        ? '<div class="gallery-grid">' + photos.map(function (p) {
            return '<figure class="gallery-item" data-photo="' + p.id + '" data-album="' + album.id + '" tabindex="0">' +
              '<div class="gallery-thumb">' + albumImage(p) + '</div>' +
              '<figcaption>' + U.esc(p.title) + '<span class="muted xs">' + U.fmtDate(p.date) + '</span></figcaption></figure>';
          }).join('') + '</div>'
        : UI.emptyState({
            icon: 'image', title: 'No photos in this album',
            message: 'Add photos, or keep this album ready for the next club event.',
            actions: Auth.can('gallery', 'create') ? '<button type="button" class="btn btn-primary" data-gal="new-photo" data-album="' + album.id + '">' + Icons.svg('plus', { class: 'btn-ico' }) + 'Add photo</button>' : ''
          })
    });
  }

  Router.view('/gallery', {
    title: 'Gallery', icon: 'image', module: 'gallery',
    render: function () {
      if (!Auth.can('gallery', 'view')) return UI.restricted('gallery');
      var albums = Store.all('albums');
      var total = Store.count('gallery');
      var body;
      if (state.albumId) {
        var album = Store.find('albums', state.albumId);
        body = album ? photosView(album) : UI.emptyState({ icon: 'folder', title: 'Album not found', message: 'This album may have been deleted.' });
      } else {
        body = albumsView();
        var recent = U.sortBy(Store.all('gallery'), 'date', 'desc').slice(0, 8);
        if (recent.length) {
          body += UI.card({
            title: 'Recently added photos', icon: 'clock',
            body: '<div class="gallery-grid">' + recent.map(function (p) {
              var al = Store.find('albums', p.albumId);
              return '<figure class="gallery-item" data-photo="' + p.id + '" data-album="' + p.albumId + '" tabindex="0">' +
                '<div class="gallery-thumb">' + albumImage(p) + '</div>' +
                '<figcaption>' + U.esc(p.title) + '<span class="muted xs">' + U.esc(al ? al.name : '') + '</span></figcaption></figure>';
            }).join('') + '</div>'
          });
        }
      }
      return '<div class="page">' +
        UI.pageHeader({
          title: 'Gallery', icon: 'image',
          subtitle: 'Photographs of club meetings, training sessions, competitions, projects and events.',
          actions: (Auth.can('gallery', 'create') ? '<button type="button" class="btn btn-primary" data-gal="new-album">' + Icons.svg('plus', { class: 'btn-ico' }) + 'Create album</button>' : '') +
            (state.albumId ? '<a class="btn btn-outline" href="#/gallery">' + Icons.svg('arrow-left', { class: 'btn-ico' }) + 'All albums</a>' : '')
        }) +
        '<div class="stat-grid">' +
          UI.statCard({ label: 'Albums', value: U.num(albums.length), icon: 'folder', tone: 'primary', foot: 'Organised by category' }) +
          UI.statCard({ label: 'Photos', value: U.num(total), icon: 'image', tone: 'secondary', foot: 'Placeholder images in demo mode' }) +
          UI.statCard({ label: 'Categories', value: U.num(U.uniq(albums.map(function (a) { return a.category; })).length), icon: 'layers', tone: 'accent', foot: 'Meetings, training, events…' }) +
          UI.statCard({ label: 'Latest album', value: albums.length ? U.truncate(U.sortBy(albums, 'date', 'desc')[0].name, 20) : '—', icon: 'calendar', tone: 'info', foot: albums.length ? U.timeAgo(U.sortBy(albums, 'date', 'desc')[0].date) : 'No albums yet' }) +
        '</div>' +
        UI.card({
          body: '<div class="alert alert-info">' + Icons.svg('image') +
            '<div><strong>Demo gallery</strong>Photographs are shown as generated placeholders. When media storage is connected, real photos uploaded by members will replace them.</div></div>' +
            '<div class="flex between center wrap gap-2 mt-2">' +
              '<div class="chip-row">' +
                '<span class="chip' + (state.category ? '' : ' active') + '" data-gal-cat="">All categories</span>' +
                Data.GALLERY_CATEGORIES.map(function (c) {
                  return '<span class="chip' + (state.category === c ? ' active' : '') + '" data-gal-cat="' + U.attr(c) + '">' + U.esc(c) + '</span>';
                }).join('') +
              '</div>' +
              UI.segmented([
                { key: 'albums', label: 'Albums', icon: 'folder' },
                { key: 'categories', label: 'By category', icon: 'layers' }
              ], state.mode) +
            '</div>'
        }) +
        (state.mode === 'categories' ? categoryView() : body) +
        '</div>';
    },
    mount: function (ctx, root) {
      root.addEventListener('click', function (e) {
        var openAlbum = e.target.closest('[data-open-album]');
        if (openAlbum) { e.preventDefault(); state.albumId = openAlbum.getAttribute('data-open-album'); Router.refresh(); return; }
        var chip = e.target.closest('[data-gal-cat]');
        if (chip) { state.category = chip.getAttribute('data-gal-cat'); Router.refresh(); return; }
        var seg = e.target.closest('[data-seg]');
        if (seg) { state.mode = seg.getAttribute('data-seg'); Router.refresh(); return; }
        var act = e.target.closest('[data-gal]');
        if (act) {
          var what = act.getAttribute('data-gal');
          if (what === 'new-album') openAlbumForm();
          if (what === 'edit-album') openAlbumForm(Store.find('albums', act.getAttribute('data-album')));
          if (what === 'new-photo') openPhotoForm(Store.find('albums', act.getAttribute('data-album')));
          return;
        }
        var fig = e.target.closest('[data-photo]');
        if (fig) {
          var album = Store.find('albums', fig.getAttribute('data-album'));
          var photo = Store.find('gallery', fig.getAttribute('data-photo'));
          if (album && photo) openLightbox(album, photo);
        }
      });
      root.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var fig = e.target.closest && e.target.closest('[data-photo]');
        if (!fig) return;
        var album = Store.find('albums', fig.getAttribute('data-album'));
        var photo = Store.find('gallery', fig.getAttribute('data-photo'));
        if (album && photo) openLightbox(album, photo);
      });
    }
  });

  function categoryView() {
    return Data.GALLERY_CATEGORIES.map(function (cat) {
      var albums = Store.where('albums', function (a) { return a.category === cat; });
      if (!albums.length) return '';
      var photos = Store.all('gallery').filter(function (p) { return p.category === cat; });
      return UI.card({
        title: cat, icon: 'layers', sub: albums.length + ' album' + (albums.length === 1 ? '' : 's') + ' · ' + photos.length + ' photos',
        body: '<div class="gallery-grid">' + photos.slice(0, 8).map(function (p) {
          return '<figure class="gallery-item" data-photo="' + p.id + '" data-album="' + p.albumId + '" tabindex="0">' +
            '<div class="gallery-thumb">' + albumImage(p) + '</div>' +
            '<figcaption>' + U.esc(p.title) + '<span class="muted xs">' + U.esc((Store.find('albums', p.albumId) || {}).name || '') + '</span></figcaption></figure>';
        }).join('') + '</div>' +
        '<div class="mt-2">' + albums.map(function (a) {
          return '<a class="link-btn mr-2" href="#/gallery" data-open-album="' + a.id + '">' + Icons.svg('folder') + ' ' + U.esc(a.name) + '</a> ';
        }).join('') + '</div>'
      });
    }).join('') || UI.emptyState({ icon: 'image', title: 'Nothing to show', message: 'No albums match the selected category.' });
  }

  /* Album deep links keep working when the category view is open. */
  Router.view('/gallery/:id', {
    title: 'Album', icon: 'image', module: 'gallery',
    render: function (ctx) {
      if (!Auth.can('gallery', 'view')) return UI.restricted('gallery');
      var album = Store.find('albums', ctx.params.id);
      if (!album) {
        return '<div class="page">' + UI.emptyState({
          icon: 'folder', title: 'Album not found', message: 'This album may have been deleted.',
          actions: '<a class="btn btn-primary" href="#/gallery">' + Icons.svg('arrow-left', { class: 'btn-ico' }) + 'All albums</a>'
        }) + '</div>';
      }
      return '<div class="page">' +
        '<nav class="breadcrumbs">' + UI.crumbs([{ label: 'Dashboard', href: '#/dashboard' }, { label: 'Gallery', href: '#/gallery' }, { label: album.name }]) + '</nav>' +
        photosView(album) + '</div>';
    },
    mount: function (ctx, root) {
      root.addEventListener('click', function (e) {
        var act = e.target.closest('[data-gal]');
        if (act) {
          var what = act.getAttribute('data-gal');
          var album = Store.find('albums', ctx.params.id);
          if (what === 'new-photo') openPhotoForm(album);
          if (what === 'edit-album') openAlbumForm(album);
          return;
        }
        var fig = e.target.closest('[data-photo]');
        if (fig) {
          var album2 = Store.find('albums', fig.getAttribute('data-album'));
          var photo = Store.find('gallery', fig.getAttribute('data-photo'));
          if (album2 && photo) openLightbox(album2, photo);
        }
      });
    }
  });

  global.Modules = global.Modules || {};
  global.Modules.Gallery = {
    openAlbumForm: openAlbumForm,
    openPhotoForm: openPhotoForm,
    openLightbox: openLightbox,
    photosOf: photosOf
  };
})(window);
