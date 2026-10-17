// Chess Ascent site settings.
// 1. Copy this file and name the copy  chess-ascent-config.js  (the website folder already has one: just edit it).
// 2. shareUrl: your website address, used in the links people share (daily puzzle, challenges). Leave it as it is to
//    use whatever address the game was opened from.
// 3. googleClientId (optional): your OAuth client ID from Google Cloud Console (APIs & Services > Credentials). It ends with
//    .apps.googleusercontent.com. Never put the client SECRET here: the app does not need it. Leave the placeholder to keep
//    Google sign-in off (progress is then saved in the browser only).
// The real chess-ascent-config.js is ignored by git, so it never ends up in the code repository.
window.CHESS_ASCENT_CONFIG = {
  shareUrl: 'https://yourdomain.com/',
  googleClientId: 'PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com'
};
