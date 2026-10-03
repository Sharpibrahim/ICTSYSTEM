/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/icons.js
   Inline SVG icon sprite. All icons are drawn on a 24×24 grid in a line style
   that suits professional management software. No external icon dependency.
   ========================================================================== */
(function (global) {
  'use strict';

  /* Each entry is the inner markup of a 24×24 symbol. */
  var I = {
    /* — Brand —————————————————————————————————————————————— */
    'club-logo': '<path d="M12 2.9l7.6 4.4v9.4L12 21.1l-7.6-4.4V7.3z"/><path d="M8.1 12h2.4l1.4-2.9 1.7 5.8L15 12h1.1"/><circle cx="12" cy="12" r="10.2" opacity=".28"/>',

    /* — Modules ———————————————————————————————————————————— */
    dashboard: '<rect x="3" y="3" width="7.6" height="7.6" rx="2.2"/><rect x="13.4" y="3" width="7.6" height="7.6" rx="2.2"/><rect x="3" y="13.4" width="7.6" height="7.6" rx="2.2"/><rect x="13.4" y="13.4" width="7.6" height="7.6" rx="2.2"/>',
    users: '<path d="M16 20.5v-1.6a4.2 4.2 0 0 0-4.2-4.2H7.2A4.2 4.2 0 0 0 3 18.9v1.6"/><circle cx="9.5" cy="7.8" r="3.6"/><path d="M21 20.5v-1.6a4.2 4.2 0 0 0-3.1-4"/><path d="M15.6 4.4a3.6 3.6 0 0 1 0 6.9"/>',
    user: '<path d="M19 20.5v-1.7a4.6 4.6 0 0 0-4.6-4.6H9.6A4.6 4.6 0 0 0 5 18.8v1.7"/><circle cx="12" cy="7.6" r="3.9"/>',
    'user-plus': '<path d="M15.5 20.5v-1.7a4.6 4.6 0 0 0-4.6-4.6H7.6A4.6 4.6 0 0 0 3 18.8v1.7"/><circle cx="9.2" cy="7.6" r="3.9"/><path d="M19 7v6M16 10h6"/>',
    'user-check': '<path d="M14.5 20.5v-1.7a4.6 4.6 0 0 0-4.6-4.6H6.6A4.6 4.6 0 0 0 2 18.8v1.7"/><circle cx="8.2" cy="7.6" r="3.9"/><path d="M16.5 11.5l2 2 3.5-3.6"/>',
    'user-cog': '<path d="M14.5 20.5v-1.7a4.6 4.6 0 0 0-4.6-4.6H6.6A4.6 4.6 0 0 0 2 18.8v1.7"/><circle cx="8.2" cy="7.6" r="3.7"/><circle cx="18" cy="16" r="2.6"/><path d="M18 11.6v1.2M18 19.2v1.2M13.9 16h1.2M20.9 16h1.2"/>',
    crown: '<path d="M2.6 7.6l3.9 3.2L12 4.2l5.5 6.6 3.9-3.2-1.7 10.4a1 1 0 0 1-1 .9H5.3a1 1 0 0 1-1-.9z"/><path d="M7.4 15.4h9.2"/>',
    shield: '<path d="M12 3l7.6 2.9v6.2c0 4.4-3.1 8.3-7.6 9.5-4.5-1.2-7.6-5.1-7.6-9.5V5.9z"/>',
    'shield-check': '<path d="M12 3l7.6 2.9v6.2c0 4.4-3.1 8.3-7.6 9.5-4.5-1.2-7.6-5.1-7.6-9.5V5.9z"/><path d="M9 12.2l2.2 2.2 4.2-4.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.6"/><path d="M8 3v4M16 3v4M3 10.2h18"/>',
    'calendar-check': '<rect x="3" y="5" width="18" height="16" rx="2.6"/><path d="M8 3v4M16 3v4M3 10.2h18"/><path d="M8.8 15.4l2.2 2.2 4.2-4.4"/>',
    'calendar-plus': '<rect x="3" y="5" width="18" height="16" rx="2.6"/><path d="M8 3v4M16 3v4M3 10.2h18"/><path d="M12 13v5M9.5 15.5h5"/>',
    'calendar-days': '<rect x="3" y="5" width="18" height="16" rx="2.6"/><path d="M8 3v4M16 3v4M3 10.2h18"/><path d="M7.5 14h.01M12 14h.01M16.5 14h.01M7.5 17.5h.01M12 17.5h.01M16.5 17.5h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.1 1.9"/>',
    timer: '<circle cx="12" cy="13.6" r="7.4"/><path d="M12 9.8v3.8l2.6 1.6"/><path d="M9.4 2.6h5.2"/>',
    megaphone: '<path d="M4 10.2v3.6a1.6 1.6 0 0 0 1.6 1.6h1.9L12 19.8V4.2L7.5 8.6H5.6A1.6 1.6 0 0 0 4 10.2z"/><path d="M16 9.2a4 4 0 0 1 0 5.6"/><path d="M18.8 6.4a8 8 0 0 1 0 11.2"/>',
    'book-open': '<path d="M12 6.6C10.4 5 8.2 4.4 4.2 4.6v13.2c3.9-.2 6.2.5 7.8 2.1 1.6-1.6 3.9-2.3 7.8-2.1V4.6c-4-.2-6.2.4-7.8 2z"/><path d="M12 6.6v13.3"/>',
    book: '<path d="M5 4.5h6.5A2.5 2.5 0 0 1 14 7v13a2 2 0 0 0-2-2H5z"/><path d="M19 4.5h-4.5A2 2 0 0 0 12.6 6"/><path d="M19 4.5V18h-4.4a2 2 0 0 0-1.6.8"/>',
    graduation: '<path d="M2.6 9L12 4.4 21.4 9 12 13.6z"/><path d="M6.2 11v4.4c0 1.7 2.8 3.4 5.8 3.4s5.8-1.7 5.8-3.4V11"/>',
    award: '<circle cx="12" cy="9.4" r="5.6"/><path d="M8.6 14.2L7 21l5-2.5 5 2.5-1.6-6.8"/>',
    medal: '<circle cx="12" cy="15" r="5.6"/><path d="M8.4 10.6L5.5 3.5h13l-2.9 7.1"/><path d="M12 12.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
    trophy: '<path d="M7.5 4h9v5.2a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.6H4.6v1.2a3.4 3.4 0 0 0 2.9 3.3"/><path d="M16.5 5.6h2.9v1.2a3.4 3.4 0 0 1-2.9 3.3"/><path d="M12 13.7v3.4M8.4 20.5h7.2"/>',
    target: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.7"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
    flag: '<path d="M6 21.2V3.4"/><path d="M6 4.2h11.4l-2.1 4.2 2.1 4.2H6z"/>',
    rocket: '<path d="M12 3.2c3.5 2.1 5.6 5.6 5.6 9.8l-2.1 4.4H8.5l-2.1-4.4c0-4.2 2.1-7.7 5.6-9.8z"/><circle cx="12" cy="10.2" r="1.9"/><path d="M8.6 17.4L6 20.4M15.4 17.4l2.6 3"/>',
    layers: '<path d="M12 3.4L3 8l9 4.6L21 8z"/><path d="M3 12.6l9 4.6 9-4.6"/><path d="M3 16.9l9 4.6 9-4.6"/>',
    kanban: '<rect x="3.4" y="4" width="5.2" height="13.6" rx="1.8"/><rect x="9.9" y="4" width="5.2" height="9" rx="1.8"/><rect x="16.4" y="4" width="4.2" height="12" rx="1.8"/>',
    'check-square': '<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3.6"/><path d="M8 12.2l2.8 2.7L16.6 9"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 2.7L16.6 9.4"/>',
    'clipboard-list': '<rect x="5" y="4.4" width="14" height="16.2" rx="2.4"/><path d="M9 4.4V3.6A1.2 1.2 0 0 1 10.2 2.4h3.6A1.2 1.2 0 0 1 15 3.6v.8z"/><path d="M8.6 10.4h6.8M8.6 13.8h6.8M8.6 17.2h4"/>',
    'clipboard-check': '<rect x="5" y="4.4" width="14" height="16.2" rx="2.4"/><path d="M9 4.4V3.6A1.2 1.2 0 0 1 10.2 2.4h3.6A1.2 1.2 0 0 1 15 3.6v.8z"/><path d="M9 13.4l2.2 2.2 4-4.4"/>',
    'file-text': '<path d="M13.6 3.4H7a2.2 2.2 0 0 0-2.2 2.2v12.8A2.2 2.2 0 0 0 7 20.6h10a2.2 2.2 0 0 0 2.2-2.2V9z"/><path d="M13.6 3.4V9h5.6"/><path d="M8.4 13h7.2M8.4 16.4h5"/>',
    file: '<path d="M13.6 3.4H7a2.2 2.2 0 0 0-2.2 2.2v12.8A2.2 2.2 0 0 0 7 20.6h10a2.2 2.2 0 0 0 2.2-2.2V9z"/><path d="M13.6 3.4V9h5.6"/>',
    folder: '<path d="M3.4 6.6a2.2 2.2 0 0 1 2.2-2.2h3.3l2.1 2.6h7.4a2.2 2.2 0 0 1 2.2 2.2v8.2a2.2 2.2 0 0 1-2.2 2.2H5.6a2.2 2.2 0 0 1-2.2-2.2z"/>',
    'folder-open': '<path d="M3.4 17.6V6.6a2.2 2.2 0 0 1 2.2-2.2h3.3l2.1 2.6h6.4a2.2 2.2 0 0 1 2.2 2.2v1"/><path d="M3.4 17.6L6 11.4h15.2l-2.6 6.2a2 2 0 0 1-1.9 1.3H5.4a2 2 0 0 1-2-1.3z"/>',
    image: '<rect x="3.4" y="4.4" width="17.2" height="15.2" rx="2.6"/><circle cx="8.6" cy="9.8" r="1.8"/><path d="M4 17.2l4.6-4.2 3.4 3 3-2.6 5 4.4"/>',
    camera: '<path d="M4.6 7.6h2.9l1.5-2.6h6l1.5 2.6h2.9A1.6 1.6 0 0 1 21 9.2v8.6a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.8V9.2a1.6 1.6 0 0 1 1.6-1.6z"/><circle cx="12" cy="13.2" r="3.3"/>',
    'bar-chart': '<path d="M3.4 20.6h17.2"/><path d="M6.8 17V10.4M12 17V4.4M17.2 17v-4.6"/>',
    'pie-chart': '<circle cx="12" cy="12" r="8.6"/><path d="M12 3.4V12l7.6 4.2"/>',
    'line-chart': '<path d="M3.4 3.6v17h17"/><path d="M7 15.4l3.6-4.2 3 2.6L20 8"/>',
    activity: '<path d="M2.6 12h3.6L9 4.8l4 14.4 2.6-7.2h5.8"/>',
    database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    server: '<rect x="3.4" y="4" width="17.2" height="7" rx="2.2"/><rect x="3.4" y="13" width="17.2" height="7" rx="2.2"/><circle cx="7.2" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="7.2" cy="16.5" r="1" fill="currentColor" stroke="none"/>',
    cpu: '<rect x="4.6" y="4.6" width="14.8" height="14.8" rx="3.2"/><rect x="8.6" y="8.6" width="6.8" height="6.8" rx="1.8"/><path d="M9.6 4.6V2.8M14.4 4.6V2.8M9.6 21.2v-1.8M14.4 21.2v-1.8M4.6 9.6H2.8M4.6 14.4H2.8M21.2 9.6h-1.8M21.2 14.4h-1.8"/>',
    harddrive: '<rect x="3.4" y="5" width="17.2" height="6.4" rx="2.2"/><rect x="3.4" y="12.6" width="17.2" height="6.4" rx="2.2"/><path d="M7 8.2h.01M7 15.8h.01"/>',
    wifi: '<path d="M4.4 9.4a11.2 11.2 0 0 1 15.2 0"/><path d="M7.5 12.9a6.8 6.8 0 0 1 9 0"/><path d="M10.5 16.3a3 3 0 0 1 3 0"/><circle cx="12" cy="19.4" r="1.1" fill="currentColor" stroke="none"/>',
    network: '<rect x="9" y="2.8" width="6" height="5" rx="1.6"/><rect x="2.6" y="16.2" width="6" height="5" rx="1.6"/><rect x="15.4" y="16.2" width="6" height="5" rx="1.6"/><path d="M12 7.8v4M5.6 16.2v-2.6h12.8v2.6"/>',
    cloud: '<path d="M7.2 18.6h9.4a4.1 4.1 0 0 0 .5-8.2 6.2 6.2 0 0 0-12 1.6 3.6 3.6 0 0 0 2.1 6.6z"/>',
    code: '<path d="M8.6 8L4.4 12l4.2 4M15.4 8l4.2 4-4.2 4M13.4 4.8l-2.8 14.4"/>',
    terminal: '<rect x="3" y="4.4" width="18" height="15.2" rx="2.6"/><path d="M7.6 10l2.6 2.6-2.6 2.6M13 15.2h4"/>',
    'git-branch': '<circle cx="7" cy="5.4" r="2.6"/><circle cx="7" cy="18.6" r="2.6"/><circle cx="17" cy="9" r="2.6"/><path d="M7 8v8"/><path d="M17 11.6c0 3-2.4 4.2-5 4.6"/>',
    palette: '<path d="M12 3.4a8.6 8.6 0 0 0 0 17.2c1.5 0 2.1-1 2.1-2s-.9-1.6-.9-2.7.8-1.8 2.1-1.8h1.6a3.7 3.7 0 0 0 3.7-3.7c0-3.9-3.9-7-8.6-7z"/><circle cx="7.9" cy="10.6" r="1.2"/><circle cx="12" cy="7.8" r="1.2"/><circle cx="16.2" cy="10.2" r="1.2"/>',
    'qr-code': '<rect x="3.4" y="3.4" width="6.6" height="6.6" rx="1.6"/><rect x="14" y="3.4" width="6.6" height="6.6" rx="1.6"/><rect x="3.4" y="14" width="6.6" height="6.6" rx="1.6"/><path d="M14 14h3.2v3.2H14zM20.6 14v6.6h-4M17.4 20.6h.01"/>',
    'id-card': '<rect x="2.6" y="5" width="18.8" height="14" rx="2.6"/><circle cx="8.6" cy="11" r="2.4"/><path d="M4.9 16.6c.6-1.6 2-2.5 3.7-2.5s3.1.9 3.7 2.5"/><path d="M14.8 10h4.2M14.8 13h3.2"/>',
    building: '<path d="M4 20.4V6a2 2 0 0 1 2-2h6.4a2 2 0 0 1 2 2v14.4"/><path d="M14.4 9.8h3.6a2 2 0 0 1 2 2v8.6"/><path d="M3 20.4h18"/><path d="M7.4 8h3.6M7.4 11.6h3.6M7.4 15.2h3.6"/>',
    globe: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2"/><path d="M12 3.4c2.2 2.4 3.4 5.4 3.4 8.6s-1.2 6.2-3.4 8.6c-2.2-2.4-3.4-5.4-3.4-8.6S9.8 5.8 12 3.4z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
    home: '<path d="M4 10.4L12 3.8l8 6.6v9a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19.4z"/><path d="M9.4 20.8v-6.2h5.2v6.2"/>',
    briefcase: '<rect x="3.4" y="7.4" width="17.2" height="12.2" rx="2.4"/><path d="M9 7.4V6a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 6v1.4"/><path d="M3.4 12.6h17.2"/>',
    wallet: '<path d="M3.4 7.6a2.2 2.2 0 0 1 2.2-2.2h10.8a2.2 2.2 0 0 1 2.2 2.2v1"/><rect x="3.4" y="7.6" width="17.2" height="11.4" rx="2.6"/><circle cx="16.6" cy="13.3" r="1.2" fill="currentColor" stroke="none"/>',
    dollar: '<path d="M12 3.4v17.2"/><path d="M16.2 7.4c0-1.8-1.9-2.8-4.2-2.8s-4.2 1-4.2 2.8 1.7 2.5 4.2 3.1 4.2 1.4 4.2 3.3-1.9 3.1-4.2 3.1-4.2-1-4.2-2.8"/>',
    'credit-card': '<rect x="2.6" y="5.4" width="18.8" height="13.2" rx="2.6"/><path d="M2.6 10h18.8"/><path d="M6.2 14.6h4"/>',
    receipt: '<path d="M5.6 3.6h12.8v17.2l-2.1-1.5-2.1 1.5-2.2-1.5-2.1 1.5-2.2-1.5-2.1 1.5z"/><path d="M9 8.4h6M9 12h6M9 15.4h3.4"/>',
    scale: '<path d="M12 4v16.4M8.4 20.4h7.2"/><path d="M4.6 8h14.8"/><path d="M4.6 8L2 13.2h5.2z"/><path d="M19.4 8L16.8 13.2H22z"/>',
    calculator: '<rect x="4.6" y="3" width="14.8" height="18" rx="2.6"/><rect x="7.8" y="6.4" width="8.4" height="3.6" rx="1"/><path d="M8.4 13.6h.01M12 13.6h.01M15.6 13.6h.01M8.4 17h.01M12 17h.01M15.6 17h.01"/>',
    package: '<path d="M12 3.2l8 4.3v9L12 20.8 4 16.5v-9z"/><path d="M4 7.5l8 4.3 8-4.3M12 11.8v9"/>',
    'shield-alert': '<path d="M12 3l7.6 2.9v6.2c0 4.4-3.1 8.3-7.6 9.5-4.5-1.2-7.6-5.1-7.6-9.5V5.9z"/><path d="M12 8.2v4"/><circle cx="12" cy="15.2" r="1" fill="currentColor" stroke="none"/>',
    lightbulb: '<path d="M9.6 18.4h4.8M10.2 21h3.6"/><path d="M12 3.4a6 6 0 0 0-3.6 10.9v4.1h7.2v-4.1A6 6 0 0 0 12 3.4z"/>',
    sparkles: '<path d="M11 3.6l1.7 4.3 4.3 1.7-4.3 1.7L11 15.6 9.3 11.3 5 9.6l4.3-1.7z"/><path d="M18.2 14.6l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z"/>',
    zap: '<path d="M13.4 3.2L5.2 13.6h5.7l-1.1 7.6 8.4-10.6h-5.6z"/>',
    star: '<path d="M12 3.6l2.7 5.4 6 .9-4.4 4.2 1.1 5.9-5.4-2.8-5.4 2.8 1.1-5.9L3.3 9.9l6-.9z"/>',
    heart: '<path d="M20.4 6.9a4.7 4.7 0 0 0-6.7 0L12 8.6l-1.7-1.7a4.7 4.7 0 1 0-6.7 6.7L12 21.2l8.4-7.6a4.7 4.7 0 0 0 0-6.7z"/>',
    'thumbs-up': '<path d="M7 10.4l3.4-6.8a1.4 1.4 0 0 1 1.3-.8h.6a2 2 0 0 1 2 2.2l-.4 3.4h4.3a2 2 0 0 1 2 2.4l-1.2 6a2.4 2.4 0 0 1-2.3 1.9H7z"/><path d="M7 10.4H3.6v8.7H7z"/>',
    history: '<path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1"/><path d="M3.6 4.4V9H8"/><path d="M12 7.8v4.6l3.1 1.8"/>',
    message: '<path d="M20.4 12c0 4.1-3.8 7.4-8.4 7.4-1.1 0-2.2-.2-3.2-.5L4 20.6l1.4-3.6A7.1 7.1 0 0 1 3.6 12c0-4.1 3.8-7.4 8.4-7.4s8.4 3.3 8.4 7.4z"/>',
    send: '<path d="M20.6 3.4L3.4 10.6l7 2.5 2.5 7z"/><path d="M10.4 13.1L20.6 3.4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.6"/><path d="M3.8 6.6L12 12.6l8.2-6"/>',
    phone: '<path d="M5 3.6h3.5l1.7 4.2-2.2 1.5a11 11 0 0 0 5.8 5.8l1.5-2.2 4.2 1.7V18a2.6 2.6 0 0 1-2.8 2.6A15.6 15.6 0 0 1 3.4 5.4 2.6 2.6 0 0 1 5 3.6z"/>',
    'map-pin': '<path d="M12 21.4s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10.3" r="2.6"/>',
    link: '<path d="M10.2 13.8a4.2 4.2 0 0 0 5.9 0l2.9-2.9a4.2 4.2 0 0 0-5.9-5.9l-1.1 1.1"/><path d="M13.8 10.2a4.2 4.2 0 0 0-5.9 0l-2.9 2.9a4.2 4.2 0 0 0 5.9 5.9l1.1-1.1"/>',
    'external-link': '<path d="M14 4.4h5.6V10"/><path d="M19.6 4.4L11 13"/><path d="M18 14v4.6a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 18.6V9a2.2 2.2 0 0 1 2.2-2.2H11"/>',
    tag: '<path d="M11.4 3.4H20v8.6l-8.6 8.6-8.6-8.6z"/><circle cx="16" cy="8" r="1.5"/>',
    paperclip: '<path d="M18.2 9.6l-6.9 6.9a4.3 4.3 0 0 1-6.1-6.1l7.1-7.1a2.9 2.9 0 0 1 4.1 4.1l-7.5 7.5a1.4 1.4 0 0 1-2-2l6.8-6.8"/>',
    search: '<circle cx="11" cy="11" r="6.6"/><path d="M15.8 15.8l4.7 4.7"/>',
    filter: '<path d="M3.8 5.6h16.4l-6.4 7.4v5.8l-3.6-2.1v-3.7z"/>',
    sliders: '<path d="M4.4 8h8.2M17.6 8h2M4.4 16h2.4M11.8 16h7.8"/><circle cx="15.2" cy="8" r="2.3"/><circle cx="9.4" cy="16" r="2.3"/>',
    sort: '<path d="M7.6 4.6v14.8M7.6 19.4l-3.6-3.6M7.6 19.4l3.6-3.6"/><path d="M16.4 19.4V4.6M16.4 4.6l-3.6 3.6M16.4 4.6l3.6 3.6"/>',
    'arrow-up': '<path d="M12 20V4.6M12 4.6L6.5 10M12 4.6L17.5 10"/>',
    'arrow-down': '<path d="M12 4v15.4M12 19.4L6.5 14M12 19.4L17.5 14"/>',
    'arrow-left': '<path d="M20 12H4.6M4.6 12L10 6.5M4.6 12L10 17.5"/>',
    'arrow-right': '<path d="M4 12h15.4M19.4 12L14 6.5M19.4 12L14 17.5"/>',
    'trending-up': '<path d="M3.4 16.6L9 11l3.4 3.4L20.6 6.2"/><path d="M15.6 6.2h5v5"/>',
    'trending-down': '<path d="M3.4 7.4L9 13l3.4-3.4L20.6 17.8"/><path d="M15.6 17.8h5v-5"/>',
    'chevron-down': '<path d="M6 9.5l6 6 6-6"/>',
    'chevron-up': '<path d="M6 14.5l6-6 6 6"/>',
    'chevron-left': '<path d="M14.5 6l-6 6 6 6"/>',
    'chevron-right': '<path d="M9.5 6l6 6-6 6"/>',
    'chevrons-left': '<path d="M11.5 6.5l-5.5 5.5 5.5 5.5M18 6.5L12.5 12l5.5 5.5"/>',
    'chevrons-right': '<path d="M12.5 6.5l5.5 5.5-5.5 5.5M6 6.5L11.5 12 6 17.5"/>',
    'more-vertical': '<circle cx="12" cy="5.4" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.6" r="1.4" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.6l4.6 4.5L19 7.2"/>',
    edit: '<path d="M4 20.2h4.2L18.6 9.8a2.2 2.2 0 0 0-3.1-3.1L5.1 17z"/><path d="M14.6 6.9l2.9 2.9"/>',
    trash: '<path d="M4 6.8h16"/><path d="M9.4 6.8V5A1.4 1.4 0 0 1 10.8 3.6h2.4A1.4 1.4 0 0 1 14.6 5v1.8"/><path d="M6.4 6.8l.9 12.1a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.9-12.1"/><path d="M10.4 10.6v6M13.6 10.6v6"/>',
    download: '<path d="M12 3.6v11.2"/><path d="M8 11.2l4 4 4-4"/><path d="M4.4 19.8h15.2"/>',
    upload: '<path d="M12 20.4V9.2"/><path d="M8 12.8l4-4 4 4"/><path d="M4.4 4.2h15.2"/>',
    print: '<path d="M7.4 9.2V3.6h9.2v5.6"/><rect x="3.4" y="9.2" width="17.2" height="7.4" rx="2.2"/><path d="M7.4 14h9.2v6.4H7.4z"/>',
    save: '<path d="M4.6 4.6h11l3.8 3.8v11H4.6z"/><path d="M8.4 4.6v4.8h7V4.6"/><path d="M8.4 19.4v-5.8h7.2v5.8"/>',
    copy: '<rect x="8.4" y="8.4" width="12" height="12" rx="2.6"/><path d="M15.6 5.4a2.2 2.2 0 0 0-2.2-2H6.4a2.2 2.2 0 0 0-2.2 2.2v7a2.2 2.2 0 0 0 2.2 2.2"/>',
    refresh: '<path d="M20.2 11.4a8.2 8.2 0 0 0-14.1-5.2L4 8.2"/><path d="M4 4.2v4h4"/><path d="M3.8 12.6a8.2 8.2 0 0 0 14.1 5.2l2.1-2"/><path d="M20 19.8v-4h-4"/>',
    bell: '<path d="M18 9.4a6 6 0 1 0-12 0c0 3.9-1.6 5.4-1.6 5.4h15.2S18 13.3 18 9.4z"/><path d="M13.7 18.4a2 2 0 0 1-3.4 0"/>',
    'check-double': '<path d="M2.6 12.8l3.8 3.8 7.2-8"/><path d="M10.6 16.6l3.8-4.2"/><path d="M14.4 12.4l6-6.4"/>',
    archive: '<rect x="3" y="4" width="18" height="4.2" rx="1.4"/><path d="M4.8 8.2v10.4a1.6 1.6 0 0 0 1.6 1.6h11.2a1.6 1.6 0 0 0 1.6-1.6V8.2"/><path d="M9.6 12.4h4.8"/>',
    pin: '<path d="M9.4 3.6h5.2l-.8 5.2 3.2 3.2H6.9l3.2-3.2z"/><path d="M12 12v8.4"/>',
    'pin-off': '<path d="M9.4 3.6h5.2l-.8 5.2 3.2 3.2H6.9l3.2-3.2z"/><path d="M12 12v8.4"/><path d="M4 4l16 16"/>',
    wrench: '<path d="M15.4 3.6a5.2 5.2 0 0 0-5 6.7L3.5 17.2a1.9 1.9 0 0 0 0 2.7l.6.6a1.9 1.9 0 0 0 2.7 0l6.9-6.9a5.2 5.2 0 0 0 6.7-6.2l-3.1 3.1-2.6-2.6z"/>',
    wand: '<path d="M4.6 19.4L15 9"/><path d="M14.4 3.4l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/><path d="M19.4 13.2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
    'upload-cloud': '<path d="M7 17.4a4.2 4.2 0 0 1 .3-8.4 5.6 5.6 0 0 1 10.7 1.6 3.6 3.6 0 0 1-.6 7.1"/><path d="M12 20.6v-8.2"/><path d="M9.2 15l2.8-2.8L14.8 15"/>',
    eraser: '<path d="M8.4 19.6H20"/><path d="M4.8 16.2l6.6-6.6a2 2 0 0 1 2.8 0l3.6 3.6a2 2 0 0 1 0 2.8l-3.4 3.4H8.6L4.8 16.2z"/><path d="M10 11.4l5.4 5.4"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v2.4M12 19.2v2.4M2.4 12h2.4M19.2 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/>',
    moon: '<path d="M20.4 14.6A8.6 8.6 0 0 1 9.4 3.6 8.6 8.6 0 1 0 20.4 14.6z"/>',
    monitor: '<rect x="3" y="4.4" width="18" height="12.2" rx="2.2"/><path d="M8.4 20.4h7.2M12 16.6v3.8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'log-in': '<path d="M15 3.6h3.4a2.2 2.2 0 0 1 2.2 2.2v12.4a2.2 2.2 0 0 1-2.2 2.2H15"/><path d="M10 8l4 4-4 4"/><path d="M14 12H3.4"/>',
    'log-out': '<path d="M9.6 3.6H6.2A2.2 2.2 0 0 0 4 5.8v12.4a2.2 2.2 0 0 0 2.2 2.2h3.4"/><path d="M16 8l4 4-4 4"/><path d="M20 12H9.6"/>',
    lock: '<rect x="4.4" y="10" width="15.2" height="10.4" rx="2.6"/><path d="M8 10V7.4a4 4 0 0 1 8 0V10"/>',
    unlock: '<rect x="4.4" y="10" width="15.2" height="10.4" rx="2.6"/><path d="M8 10V7.4a4 4 0 0 1 7.6-1.7"/>',
    key: '<circle cx="8" cy="15.4" r="3.6"/><path d="M10.6 12.8L19.4 4M16.4 6.6l2 2M14.2 8.8l2 2"/>',
    eye: '<path d="M2.4 12S6 5.6 12 5.6 21.6 12 21.6 12 18 18.4 12 18.4 2.4 12 2.4 12z"/><circle cx="12" cy="12" r="3.2"/>',
    'eye-off': '<path d="M4.2 4.2l15.6 15.6"/><path d="M9.9 5.9A9.7 9.7 0 0 1 12 5.6c6 0 9.6 6.4 9.6 6.4a17.6 17.6 0 0 1-3.3 4.1"/><path d="M6.4 7.9A17.2 17.2 0 0 0 2.4 12S6 18.4 12 18.4a10 10 0 0 0 3.4-.6"/><path d="M10.1 10.2a2.7 2.7 0 0 0 3.8 3.8"/>',
    info: '<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5.4"/><circle cx="12" cy="7.9" r="1" fill="currentColor" stroke="none"/>',
    'alert-circle': '<circle cx="12" cy="12" r="8.8"/><path d="M12 7.4v5.6"/><circle cx="12" cy="16.4" r="1" fill="currentColor" stroke="none"/>',
    'alert-triangle': '<path d="M10.3 4.6L2.9 17.4A2 2 0 0 0 4.6 20.4h14.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z"/><path d="M12 9.4v4.4"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
    'x-circle': '<circle cx="12" cy="12" r="8.8"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',
    'help-circle': '<circle cx="12" cy="12" r="8.8"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2.1-2.4 3.6"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
    ban: '<circle cx="12" cy="12" r="8.8"/><path d="M5.8 5.8l12.4 12.4"/>',
    verified: '<path d="M12 3l2.2 1.6 2.7-.2 1 2.5 2.3 1.4-.7 2.6.7 2.6-2.3 1.4-1 2.5-2.7-.2L12 21l-2.2-1.6-2.7.2-1-2.5L3.8 15.7l.7-2.6-.7-2.6 2.3-1.4 1-2.5 2.7.2z"/><path d="M9.1 12.2l2.2 2.1 3.8-4.1"/>',
    hash: '<path d="M9.4 3.6L7.6 20.4M16.4 3.6l-1.8 16.8M3.8 8.6h16.4M3 15.4h16.4"/>',
    percent: '<path d="M18.4 5.6L5.6 18.4"/><circle cx="7.6" cy="7.6" r="2.6"/><circle cx="16.4" cy="16.4" r="2.6"/>',
    'at-sign': '<circle cx="12" cy="12" r="3.8"/><path d="M15.8 8.2v5a3.2 3.2 0 0 0 5.4 2.3A8.6 8.6 0 1 0 16.6 20"/>',
    target2: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.7"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
    maximize: '<path d="M9 3.6H3.6V9M15 3.6h5.4V9M9 20.4H3.6V15M15 20.4h5.4V15"/>',
    scissors: '<circle cx="6.4" cy="6.4" r="2.6"/><circle cx="6.4" cy="17.6" r="2.6"/><path d="M8.5 8.1L20 19.4M8.5 15.9L20 4.6"/>',
    'graduation-cap': '<path d="M2.6 9L12 4.4 21.4 9 12 13.6z"/><path d="M6.2 11v4.4c0 1.7 2.8 3.4 5.8 3.4s5.8-1.7 5.8-3.4V11"/>',
    ticket: '<path d="M3.4 8.6A2 2 0 0 1 5.4 6.6h13.2a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M12 7v10" stroke-dasharray="2 2.4"/>',
    play: '<path d="M7.6 4.8l11.2 7.2L7.6 19.2z"/>',
    pause: '<path d="M9.4 4.8v14.4M14.6 4.8v14.4"/>',
    'list-checks': '<path d="M4 7.4l1.6 1.6L9 5.6M4 16.4l1.6 1.6L9 14.6"/><path d="M12.4 7.4h8M12.4 16.4h8"/>',
    list: '<path d="M8.4 6.6h11.6M8.4 12h11.6M8.4 17.4h11.6"/><circle cx="4.6" cy="6.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.6" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.6" cy="17.4" r="1.1" fill="currentColor" stroke="none"/>',
    grid: '<rect x="3.4" y="3.4" width="7.2" height="7.2" rx="2"/><rect x="13.4" y="3.4" width="7.2" height="7.2" rx="2"/><rect x="3.4" y="13.4" width="7.2" height="7.2" rx="2"/><rect x="13.4" y="13.4" width="7.2" height="7.2" rx="2"/>'
  };

  var SPRITE_ID = 'mrhs-icon-sprite';

  function inject() {
    if (document.getElementById(SPRITE_ID)) return;
    var parts = ['<svg id="' + SPRITE_ID + '" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">'];
    for (var name in I) {
      if (!Object.prototype.hasOwnProperty.call(I, name)) continue;
      parts.push('<symbol id="i-' + name + '" viewBox="0 0 24 24">' + I[name] + '</symbol>');
    }
    parts.push('</svg>');
    var holder = document.createElement('div');
    holder.innerHTML = parts.join('');
    document.body.insertBefore(holder.firstChild, document.body.firstChild);
  }

  /** Full <svg> element markup referencing a symbol. */
  function svg(name, opts) {
    opts = opts || {};
    var cls = opts.class ? ' class="' + opts.class + '"' : '';
    var size = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
    var style = opts.style ? ' style="' + opts.style + '"' : '';
    var lbl = opts.label ? ' role="img" aria-label="' + String(opts.label).replace(/"/g, '&quot;') + '"'
                         : ' aria-hidden="true" focusable="false"';
    var body = I[name] ? '<use href="#i-' + name + '"></use>' : I.info;
    return '<svg viewBox="0 0 24 24"' + cls + size + style + lbl + '>' +
      (I[name] ? body : '<use href="#i-info"></use>') + '</svg>';
  }

  /** Just the <use> reference, for icons embedded inside a host svg. */
  function ref(name) { return '<use href="#i-' + (I[name] ? name : 'info') + '"></use>'; }

  function has(name) { return !!I[name]; }

  function names() { return Object.keys(I); }

  global.Icons = { inject: inject, svg: svg, ref: ref, has: has, names: names, map: I };
})(window);
