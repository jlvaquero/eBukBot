var TelegramBot = require('node-telegram-bot-api');
var sprintf = require('sprintf-js').sprintf;
var Parser = require('opds-feed-parser').default;
var token = '185065089:AAEqQlsmObMXevvyQPfC9mOElxxY9YD1xc0';
var parser = new Parser();
var request = require('request');
var port = process.env.OPENSHIFT_NODEJS_PORT;
var host = process.env.OPENSHIFT_NODEJS_IP;
var externalUrl = process.env.OPENSHIFT_APP_DNS;
//var token = process.env.TOKEN || token;
//var bot = new TelegramBot(token, {
// polling: true
//});
var bot = new TelegramBot(token, { webHook: { port : port, host : host } });
bot.setWebHook(externalUrl + ':443/bot' + token);

var Redis = require('ioredis');
//var redis = new Redis(6379, process.env.IP);
var redis = new Redis({
  password: process.env.REDIS_PASSWORD;
});

const search_url_offset_template = 'http://www.feedbooks.com/books/search.atom?%s';
const search_url_template = 'http://www.feedbooks.com/books/search.atom?query=%s&lang=%s';
const recent_catalog = 'http://www.feedbooks.com/books/recent.atom?lang=%s';
const recent_catalog_offset_template = 'http://www.feedbooks.com/books/recent.atom?%s';
const en = 'en';
const it = 'it';
const fr = 'fr';
const de = 'de';
const es = 'es';

var langReplyKeyboardMarkup = [
 [],
 [],
 [],
 [],
 []
];

langReplyKeyboardMarkup[0][0] = 'Deutsch';
langReplyKeyboardMarkup[0][1] = 'English';
langReplyKeyboardMarkup[1][0] = 'Español';
langReplyKeyboardMarkup[1][1] = 'Français';
langReplyKeyboardMarkup[2][0] = 'Italiano';
langReplyKeyboardMarkup[2][1] = 'Cancel';
var langReplyKeyboard = {
 keyboard: langReplyKeyboardMarkup,
 resize_keyboard: true,
 one_time_keyboard: true
};

var backInline_keyboardMarkup = [
 []
];

backInline_keyboardMarkup[0][0] = {
 text: 'Share some eBook!',
 switch_inline_query: ''
};

var backInline_keyboard = {
 inline_keyboard: backInline_keyboardMarkup
};

bot.on('inline_query', function(msg) {

 redis.get(msg.from.id).then(function sendResult(lang) {

  if (lang == '' || lang == undefined || lang == null) {
   lang = en;
   redis.set(msg.from.id, lang);
  }

  redis.get(lang + ':' + msg.query + ':' + msg.offset).then(function sendResult(cacheRes) {

   if (cacheRes == '' || cacheRes == undefined || cacheRes == null) {
    if (!msg.query) {
     SendDefaultResult(msg, lang);
    }
    else {
     SendQueryResult(msg, lang);
    }
   }
   else {
    SendCachedResult(msg, cacheRes);
   }
  });
 });
});

bot.onText(/\/start$/, function(msg, match) {
 var fromId = msg.from.id;
 redis.set(fromId + ':query', '');
 bot.sendMessage(fromId, 'Send me commands to change your settings preferences for inline queries.\r\nAvailable commands are:\r\n\r\n/changelang - Change language preference.\r\n\/gotoinline - Go to inline mode.\r\n\/help - Show this message.');
});

bot.onText(/\/start (.+)/, function(msg, match) {
 var fromId = msg.from.id;
 var command = match[1].split('#')[0];
 var query = match[1].split('#')[1];

 if (command == 'changelang') {
  redis.set(fromId + ':query', query);
  bot.sendMessage(fromId, 'Please select your language preference.', {
   reply_markup: langReplyKeyboard
  });
 }
});

bot.onText(/\/changelang/, function(msg, match) {
 var fromId = msg.from.id;
 //read lang preference to display message using msg.from.id from redis
 bot.sendMessage(fromId, 'Please select your language preference.', {
  reply_markup: langReplyKeyboard
 });
});

bot.onText(/\/gotoinline/, function(msg, match) {
 var fromId = msg.from.id;
 redis.get(fromId + ':query').then((res) => {
  backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
  bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button.', {
   reply_markup: backInline_keyboard
  });
 });
});

bot.onText(/\/help/, function(msg, match) {
 var fromId = msg.from.id;
 bot.sendMessage(fromId, 'Send me commands to change your settings preferences for inline queries.\r\nAvailable commands are:\r\n\r\n/changelang - Change language preference.\r\n\/gotoinline - Go to inline mode.\r\n\/help - Show this message.');
});

bot.onText(/\Deutsch/, function(msg, match) {
 var fromId = msg.from.id;
 //store lang preference and msg.from.id in redis
 redis.set(fromId, de);
 bot.sendMessage(fromId, 'Language preference changed to Deutsch', {
  reply_markup: {
   hide_keyboard: true
  }
 });
 redis.get(fromId + ':query').then((res) => {
  backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
  bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button.', {
   reply_markup: backInline_keyboard
  });
 });
});

bot.onText(/\English/, function(msg, match) {
 var fromId = msg.from.id;
 //store lang preference and chat.id in redis
 redis.set(fromId, en);
 bot.sendMessage(fromId, 'Language preference changed to English', {
  reply_markup: {
   hide_keyboard: true
  }
 });
 redis.get(fromId + ':query').then((res) => {
  backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
  bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button.', {
   reply_markup: backInline_keyboard
  });
 });
 redis.set(fromId + ':query', '');
});

bot.onText(/\Español/, function(msg, match) {
 var fromId = msg.from.id;
 //store lang preference and chat.id in redis
 redis.set(fromId, es);
 bot.sendMessage(fromId, 'Language preference changed to Español', {
  reply_markup: {
   hide_keyboard: true
  }
 });
 redis.get(fromId + ':query').then((res) => {
  backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
  bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button.', {
   reply_markup: backInline_keyboard
  });
 });
  redis.set(fromId + ':query', '');
});

bot.onText(/\Français/, function(msg, match) {
 var fromId = msg.from.id;
 //store lang preference and chat.id in redis
 redis.set(fromId, fr);
 bot.sendMessage(fromId, 'Language preference changed to Français', {

  reply_markup: {
   hide_keyboard: true
  }
 });
 redis.get(fromId + ':query').then((res) => {
  backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
  bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button.', {
   reply_markup: backInline_keyboard
  });
 });
  redis.set(fromId + ':query', '');
});

bot.onText(/\Italiano/, function(msg, match) {
 var fromId = msg.from.id;
 //store lang preference and chat.id in redis
 redis.set(fromId, it);
 bot.sendMessage(fromId, 'Language preference changed to Italiano', {
  reply_markup: {
   hide_keyboard: true
  }
 });
 redis.get(fromId + ':query').then((res) => {
  backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
  bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button.', {
   reply_markup: backInline_keyboard
  });
 });
  redis.set(fromId + ':query', '');
});

bot.onText(/\Cancel/, function(msg, match) {
 var fromId = msg.from.id;
 bot.sendMessage(fromId, 'Language selection canceled.', {
  reply_markup: {
   hide_keyboard: true
  }
 });
 redis.get(fromId + ':query').then((res) => {
  backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
  bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button.', {
   reply_markup: backInline_keyboard
  });
 });
  redis.set(fromId + ':query', '');
});

function SendDefaultResult(msg, lang) {

 if (!msg.offset) {
  request(sprintf(recent_catalog, lang), (error, response, body) => {
   var promise = parser.parse(body);
   promise.then((result) => {
    var res = buildResponse(result);
    var offsetLink = result.links.find(l => l.rel === 'next');
    res.next_offset = ((offsetLink != undefined) ? offsetLink.href.split('?')[1] : '');
    redis.set(lang + ':' + msg.query + ':' + msg.offset, JSON.stringify(res), 'EX', 21600);
    bot.answerInlineQuery(msg.id, res.answerInlineQuery, {
     next_offset: res.next_offset,
     cache_time: 0,
     switch_pm_text: 'Change language preference',
     switch_pm_parameter: 'changelang#' + msg.query
    });
   });
  });
 }
 else {
  request(sprintf(recent_catalog_offset_template, msg.offset), (error, response, body) => {
   var promise = parser.parse(body);
   promise.then((result) => {
    var res = buildResponse(result);
    var offsetLink = result.links.find(l => l.rel === 'next');
    res.next_offset = ((offsetLink != undefined) ? offsetLink.href.split('?')[1] : '');
    redis.set(lang + ':' + msg.query + ':' + msg.offset, JSON.stringify(res), 'EX', 21600);
    bot.answerInlineQuery(msg.id, res.answerInlineQuery, {
     next_offset: res.next_offset,
     cache_time: 0,
     switch_pm_text: 'Change language preference',
     switch_pm_parameter: 'changelang#' + msg.query
    });
   });
  });
 }

}

function SendQueryResult(msg, lang) {

 if (!msg.offset) {
  var url = sprintf(search_url_template, msg.query, lang);
  request(url, (error, response, body) => {
   var promise = parser.parse(body);
   promise.then((result) => {
    var res = buildResponse(result);
    var offsetLink = result.links.find(l => l.rel === 'next');
    res.next_offset = ((offsetLink != undefined) ? offsetLink.href.split('?')[1] : '');
    redis.set(lang + ':' + msg.query + ':' + msg.offset, JSON.stringify(res), 'EX', 21600);
    bot.answerInlineQuery(msg.id, res.answerInlineQuery, {
     next_offset: res.next_offset,
     cache_time: 0,
     switch_pm_text: 'Change language preference',
     switch_pm_parameter: 'changelang#' + msg.query
    });
   });
  });
 }
 else {
  request(sprintf(search_url_offset_template, msg.offset), (error, response, body) => {
   var promise = parser.parse(body);
   promise.then((result) => {
    var res = buildResponse(result);
    var offsetLink = result.links.find(l => l.rel === 'next');
    res.next_offset = ((offsetLink != undefined) ? offsetLink.href.split('?')[1] : '');
    redis.set(lang + ':' + msg.query + ':' + msg.offset, JSON.stringify(res), 'EX', 21600);
    bot.answerInlineQuery(msg.id, res.answerInlineQuery, {
     next_offset: res.next_offset,
     cache_time: 0,
     switch_pm_text: 'Change language preference',
     switch_pm_parameter: 'changelang#' + msg.query
    });
   });
  });
 }
}

function SendCachedResult(msg, cacheRes) {
 var res = JSON.parse(cacheRes);
 bot.answerInlineQuery(msg.id, res.answerInlineQuery, {
  next_offset: res.next_offset,
  cache_time: 0,
  switch_pm_text: 'Change language preference',
  switch_pm_parameter: 'changelang#' + msg.query
 });
}

function buildResponse(feed) {

 var res = {
  answerInlineQuery: [],
  next_offset: ""
 };

 function buildEntryResponse(entry) {

  const message_text_template = '[Book details](%s)';

  var content = {
   message_text: sprintf(message_text_template, entry.links.find(l => l.rel === 'alternate').href), //alternate
   parse_mode: 'Markdown'
  };

  var keyboardArr = [
   [],
   [],
   []
  ];

  keyboardArr[0][0] = {
   text: 'EPUB',
   url: entry.links.find(l => l.type === 'application/epub+zip').href
  };

  keyboardArr[0][1] = {
   text: 'Kindle',
   url: entry.links.find(l => l.type === 'application/x-mobipocket-ebook').href
  };

  keyboardArr[0][2] = {
   text: 'PDF',
   url: entry.links.find(l => l.type === 'application/pdf').href
  };

  var inkeyboard = {
   inline_keyboard: keyboardArr
  };

  res.answerInlineQuery.push({
   type: 'article',
   id: entry.id,
   title: entry.title,
   input_message_content: content,
   reply_markup: inkeyboard,
   url: entry.links.find(l => l.rel === 'alternate').href,
   hide_url: true,
   thumb_url: entry.links.find(l => l.rel === 'http://opds-spec.org/image/thumbnail').href
  });
 }

 feed.entries.forEach(buildEntryResponse);
 return res;

}
