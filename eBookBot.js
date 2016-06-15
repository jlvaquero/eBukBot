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
 port: process.env.OPENSHIFT_REDIS_DB_PORT,          // Redis port
  host: process.env.OPENSHIFT_REDIS_DB_HOST,   // Redis host
   password: process.env.OPENSHIFT_REDIS_DB_PASSWORD
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

var langArray = [];
langArray['en'] = 'English';
langArray['it'] = 'Italiano';
langArray['fr'] = 'Français';
langArray['de'] = 'Deutsch';
langArray['es'] = 'Español';

var langReplyKeyboardMarkup = [
 [],
 [],
 [],
 [],
 []
];

langReplyKeyboardMarkup[0][0] = '\u{1F1E9}\u{1F1EA} Deutsch';
langReplyKeyboardMarkup[0][1] = '\u{1F1EC}\u{1F1E7} English';
langReplyKeyboardMarkup[1][0] = '\u{1F1EA}\u{1F1F8} Español';
langReplyKeyboardMarkup[1][1] = '\u{1F1EB}\u{1F1F7} Français';
langReplyKeyboardMarkup[2][0] = '\u{1F1EE}\u{1F1F9} Italiano';
langReplyKeyboardMarkup[2][1] = '\u{274E} Cancel';
var langReplyKeyboard = {
 keyboard: langReplyKeyboardMarkup,
 resize_keyboard: true,
 one_time_keyboard: true
};

var optionsReplyKeyboardMarkup = [
 [],
 [],
 [],
 [],
 []
];

optionsReplyKeyboardMarkup[0][0] = '\u{1F4DA} Select eBook catalog language';
optionsReplyKeyboardMarkup[1][0] = '\u{1F50D} Go to Inline mode';
optionsReplyKeyboardMarkup[1][1] = '\u{2753} Help me!';
var optionsReplyKeyboard = {
 keyboard: optionsReplyKeyboardMarkup,
 resize_keyboard: true,
 one_time_keyboard: false
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
 redis.set(fromId + ':comeFromInline', 'false');
 redis.set(fromId + ':query', '');
 bot.sendMessage(fromId, 'Hello ' + msg.from.first_name + '. What do you wish to do?', {
  reply_markup: optionsReplyKeyboard
 });
});

bot.onText(/\/start (.+)/, function(msg, match) {
 var fromId = msg.from.id;
 var command = match[1].split('#')[0];
 var query = match[1].split('#')[1];

 if (command == 'changelang') {
 redis.set(fromId + ':comeFromInline', 'true');
  redis.set(fromId + ':query', query);
  bot.sendMessage(fromId, 'Ok, Tell me in which language do you want to search eBooks, please.', {
   reply_markup: langReplyKeyboard
  });
 }
});

bot.onText(/\/changelang/, function(msg, match) {
 var fromId = msg.from.id;
 //read lang preference to display message using msg.from.id from redis
 bot.sendMessage(fromId, 'Ok, Tell me in which language do you want to search eBooks, please.', {
  reply_markup: langReplyKeyboard
 });
});

bot.onText(/Select eBook catalog language/, function(msg, match) {
 var fromId = msg.from.id;
 //read lang preference to display message using msg.from.id from redis
 bot.sendMessage(fromId, 'Ok, Tell me in which language do you want to search eBooks, please.', {
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

bot.onText(/Go to Inline mode/, function(msg, match) {
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
 bot.sendMessage(fromId, 'Of course. I am going to explain available options to you.\r\n\u{1F4DA} Select eBook catalog language - Select the language for the eBook you are looking for.\r\n\u{1F50D} Go to Inline mode - Select or return to a chat and use my Inline mode.\r\n\u{2753} Help me! - I will explain available options.\r\n\r\nWhat do you wish to do?');
});

bot.onText(/Help me!/, function(msg, match) {
 var fromId = msg.from.id;
 bot.sendMessage(fromId, 'Of course. I am going to explain available options to you.\r\n\u{1F4DA} Select eBook catalog language - Select the language for the eBook you are looking for.\r\n\u{1F50D} Go to Inline mode - Select or return to a chat and use my Inline mode.\r\n\u{2753} Help me! - I will explain your options.\r\n\r\nWhat do you wish to do?');
});

bot.onText(/Deutsch/, function(msg, match) {
 var fromId = msg.from.id;
 //store lang preference and msg.from.id in redis
 redis.set(fromId, de);
 bot.sendMessage(fromId, 'Ok. I will search eBooks in Deutsch. Anything else?', {
  reply_markup: optionsReplyKeyboard
 });
 redis.get(fromId + ':comeFromInline').then((comeFromInline) => {
   if (comeFromInline == 'true') {
    redis.get(fromId + ':query').then((res) => {
     backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
     bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button for Inline mode.', {
      reply_markup: backInline_keyboard
     });
     redis.set(fromId + ':query', '');
    });
    redis.set(fromId + ':comeFromInline', 'false');
   }
 });
});

bot.onText(/English/, function(msg, match) {
 var fromId = msg.from.id;
 //store lang preference and chat.id in redis
 redis.set(fromId, en);
 bot.sendMessage(fromId, 'Ok. I will search eBooks in English. Anything else?', {
  reply_markup: optionsReplyKeyboard
 });
  redis.get(fromId + ':comeFromInline').then((comeFromInline) => {
   if (comeFromInline == 'true') {
    redis.get(fromId + ':query').then((res) => {
     backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
     bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button for Inline mode.', {
      reply_markup: backInline_keyboard
     });
     redis.set(fromId + ':query', '');
    });
    redis.set(fromId + ':comeFromInline', 'false');
   }
 });
});

bot.onText(/Español/, function(msg, match) {
 var fromId = msg.from.id;
 //store lang preference and chat.id in redis
 redis.set(fromId, es);
 bot.sendMessage(fromId, 'Ok. I will search eBooks in Español. Anything else?', {
  reply_markup: optionsReplyKeyboard
 });
 redis.get(fromId + ':comeFromInline').then((comeFromInline) => {
   if (comeFromInline == 'true') {
    redis.get(fromId + ':query').then((res) => {
     backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
     bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button for Inline mode.', {
      reply_markup: backInline_keyboard
     });
     redis.set(fromId + ':query', '');
    });
    redis.set(fromId + ':comeFromInline', 'false');
   }
 });
});

bot.onText(/Français/, function(msg, match) {
 var fromId = msg.from.id;
 //store lang preference and chat.id in redis
 redis.set(fromId, fr);
 bot.sendMessage(fromId, 'Ok. I will search eBooks in Français.  Anything else?', {
  reply_markup: optionsReplyKeyboard
 });
 redis.get(fromId + ':comeFromInline').then((comeFromInline) => {
   if (comeFromInline == 'true') {
    redis.get(fromId + ':query').then((res) => {
     backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
     bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button for Inline mode.', {
      reply_markup: backInline_keyboard
     });
     redis.set(fromId + ':query', '');
    });
    redis.set(fromId + ':comeFromInline', 'false');
   }
 });
});

bot.onText(/Italiano/, function(msg, match) {
 var fromId = msg.from.id;
 //store lang preference and chat.id in redis
 redis.set(fromId, it);
 bot.sendMessage(fromId, 'Ok. I will search eBooks in Italiano.  Anything else?', {
  reply_markup: optionsReplyKeyboard
 });
 redis.get(fromId + ':comeFromInline').then((comeFromInline) => {
   if (comeFromInline == 'true') {
    redis.get(fromId + ':query').then((res) => {
     backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
     bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button for Inline mode.', {
      reply_markup: backInline_keyboard
     });
     redis.set(fromId + ':query', '');
    });
    redis.set(fromId + ':comeFromInline', 'false');
   }
 });
});

bot.onText(/Cancel/, function(msg, match) {
 var fromId = msg.from.id;
 bot.sendMessage(fromId, 'Ok, I will not change your language preference. Anything else?' , {
  reply_markup: optionsReplyKeyboard
 });
  redis.get(fromId + ':comeFromInline').then((comeFromInline) => {
   if (comeFromInline == 'true') {
    redis.get(fromId + ':query').then((res) => {
     backInline_keyboard.inline_keyboard[0][0].switch_inline_query = res;
     bot.sendMessage(fromId, 'Tap this' + '\u{1F447}' + 'button for Inline mode.', {
      reply_markup: backInline_keyboard
     });
     redis.set(fromId + ':query', '');
    });
    redis.set(fromId + ':comeFromInline', 'false');
   }
 });
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

   var epubLink = entry.links.find(l => l.type === 'application/epub+zip');
  var kindleLink = entry.links.find(l => l.type === 'application/x-mobipocket-ebook');
  var pdfLink = entry.links.find(l => l.type === 'application/pdf');
  
  if (epubLink){
  keyboardArr[0][0] = {
   text: 'EPUB',
   url: epubLink.href
  };
  }

if(kindleLink){
  keyboardArr[0][1] = {
   text: 'Kindle',
   url: kindleLink.href
  };
}

if (pdfLink){
  keyboardArr[0][2] = {
   text: 'PDF',
   url: pdfLink.href
  };
}
  var inkeyboard = {
   inline_keyboard: keyboardArr
  };

  res.answerInlineQuery.push({
   type: 'article',
   id: entry.id,
   title: entry.title,
    description: 'by ' + getAutors(entry.authors),
   input_message_content: content,
   reply_markup: inkeyboard,
   url: entry.links.find(l => l.rel === 'alternate').href,
   hide_url: true,
   thumb_url: entry.links.find(l => l.rel === 'http://opds-spec.org/image/thumbnail').href
  });
 }

function getAutors(authors){
  var authString = authors[0].name;
  for (var i = 1; i < authors.length; i++) {
   authString = authString + ', ' + authors[i].name;
  }
  return authString;
 }
 
 feed.entries.forEach(buildEntryResponse);
 return res;

}

