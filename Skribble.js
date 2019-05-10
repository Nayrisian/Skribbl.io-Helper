const helperPreInit = new Event('helperPreInit');
const helperPostInit = new Event('helperPostInit');

window.addEventListener('helperPostInit', function() {
    $('.container-fluid').css('margin-left', '0');
});

class Helper {
    constructor() {
        this.$autoRestart = true;
        // Arrays containing k/v pairs.
        this.$commands;
        this.$dictionary;
        // Pointers to HTML objects.
        this.$helper;
        this.$hintList;
        this.$triedList;
        this.$inputChat = $('#inputChat')[0];
        this.$formChat = $('#formChat')[0];
        this.$currentWord = $('#currentWord')[0];
        this.$solutionWord = $('#overlay > .content > .text')[0];
        this.$screenLogin = $('#screenLogin')[0];
        this.$selectWord = $('#overlay > .content > .wordContainer')[0];
        // Retrieve locally stored data, if possible.
        this.$commands = JSON.parse(localStorage.getItem('$commands'))
                || { 'arabic': `﷽`.repeat(100), 'greek': `ௌ`.repeat(100) };
        this.$dictionary = JSON.parse(localStorage.getItem('$dictionary')) || {};
        this.$triedWords = new Set();
        // Initialise overlay.
        this.initOverlay();
        // Setup observers for objects to observe.
        this.$currentWordObserver = this.observeDOMNode(this.$currentWord, target => {
            let underscoreCount = target.innerHTML.split('_').length - 1;
            if (underscoreCount > 0) {
                this.$hintList.empty();
                this.$triedList.empty();
                let words = this.getWords(target.innerHTML);
                if (words !== undefined) {
                    words.forEach(word => {
                        if (this.$triedWords.has(word['word']) === false) {
                            this.addHintNode(word, false);
                        } else {
                            this.addHintNode(word, true);
                        }
                    });
                }
            }
        });
        this.$solutionWordObserver = this.observeDOMNode(this.$solutionWord, target => {
            let textPhrase = target.innerHTML;
            if (textPhrase === 'Choose a word') {
                this.ownRound = true;
                // Add words to dictioanry.
            } else if (textPhrase.startsWith('The word was: ')) {
                if (this.ownRound) {
                    this.ownRound = false;
                } else {
                    let word = textPhrase.split('The word was: ').pop();
                    this.addWord(word);
                }
                this.$triedWords = new Set();
            }
        });
        this.$screenLoginObserver = this.observeDOMObject(this.$screenLogin, target => {
            if (target.style.display !== 'none' && this.$autoRestart) {
                this.autoStart();
            }
        });
        if (this.$autoRestart && this.$screenLogin.style.display !== 'none') {
            this.autoStart();
        }
        window.dispatchEvent(helperPostInit);
    }

    autoStart() {
        let wait = ms => new Promise((r, j) => setTimeout(r, ms));
        (async () => {
            await wait(2000);
            $('#formLogin > button')[0].click();
        })();
    }

    addWord(word) {
        if (this.$dictionary[word.length] === undefined)
            this.$dictionary[word.length] = [];
        let result = this.$dictionary[word.length].some(element => {
            if (element['word'] === word) {
                element['frequency'] = element['frequency'] + 1;
                (async () => {
                    await this.sort(this.$dictionary[word.length]);
                })();
                return true;
            }
            return false;
        });
        if (result === false) {
            this.$dictionary[word.length].push({ 'word': word, 'frequency': 1 });
            this.save();
        }
    }

    getWords(word) {
        let regex = word.replace(/_/g, '\\w');
        let filterRegex = new RegExp(regex, 'g');
        let words = [];
        if (this.$dictionary[word.length] !== undefined) {
            this.$dictionary[word.length].forEach(function(entry) {
                if (entry['word'].match(filterRegex))
                    words.push(entry);
            });
        }
        return words;
    }

    save() {
        localStorage.setItem('$commands', JSON.stringify(this.$commands));
        localStorage.setItem('$dictionary', JSON.stringify(this.$dictionary));
    }

    async sort(array) {
        array.sort(function(a, b) { return b['frequency'] - a['frequency']; });
        this.save();
    }

    initOverlay() {
        this.$helper = $('<div>', { id: 'helperOverlay' });
        this.$helper.css({
            'position': 'fixed',
            'top': '0rem',
            'right': '0rem',
            'width': '32rem',
            'height': '100%',
            'padding': '0px',
            'background-color': 'rgba(100, 0, 150, 255)',
            'color': 'rgba(255, 255, 0, 255)',
            'display': 'flex',
            'flex-direction': 'column' });
        this.$options = $('<div>', { id: 'helperOptions' });
        this.$helper.append(this.$options);
        this.$hintList = $('<div>', { id: 'helperHintList' });
        this.$hintList.css({
            'display': 'flex',
            'flex-basis': '100%',
            'flex-shrink': '1',
            'flex-direction': 'column',
            'overflow': 'auto' });
        this.$helper.append(this.$hintList);
        this.$triedList = $('<div>', { id: 'helperTriedList' });
        this.$triedList.css({
            'display': 'flex',
            'max-height': '12rem',
            'flex-grow': '1',
            'flex-direction': 'column' });
        this.$helper.append(this.$triedList);
        $('body').append(this.$helper);
    }

    addHintNode(word, tried) {
        let $holder = $('<div>', { class: 'hintHolder' });
        let $word = $('<div>', { class: 'hintWord' });
        let $freq = $('<div>', { class: 'hintFreq' });

        $word.html('<p>' + word['word'] + '</p>');
        $freq.html('<p>' + word['frequency'] + '</p>');
        $holder.append($word);
        $holder.append($freq);

        $holder.click(() => {
            this.insertHint(word['word']);
            this.$triedWords.add(word['word']);
            this.setTriedWord($holder, $word, $freq);
            this.$triedList.append($holder);
        });

        if (tried) {
            this.setTriedWord($holder, $word, $freq);
            this.$triedList.append($holder);
        } else {
            this.unsetTriedWord($holder, $word, $freq);
            this.$hintList.append($holder);
        }
        $('.hintHolder > * > p').css({
            'position': 'relative',
            'top': '50%',
            'transform': 'translateY(-50%)' });
    }

    setTriedWord(a, b, c) {
        a.css({
            'display': 'flex',
            'background-color': 'rgba(255, 255, 255, 255)'
        });
        b.css({
            'flex-grow': '1',
            'height': '3rem',
            'border': '0.1rem',
            'border-style': 'solid',
            'text-align': 'center',
            'color': 'rgba(169, 169, 169, 255)',
            'background-color': 'rgba(80, 0, 0, 255)',
            'border-color': 'rgba(255, 255, 0, 255)' });
        c.css({
            'flex-basis': '15%',
            'height': '3rem',
            'border': '0.1rem',
            'border-style': 'solid',
            'text-align': 'center',
            'color': 'rgba(169, 169, 169, 255)',
            'background-color': 'rgba(80, 0, 0, 255)',
            'border-color': 'rgba(255, 255, 0, 255)' });
    }

    unsetTriedWord(a, b, c) {
        a.css({
            'display': 'flex',
            'background-color': 'rgba(255, 255, 255, 255)' });
        b.css({
            'flex-grow': '1',
            'height': '3rem',
            'border': '0.1rem',
            'border-style': 'solid',
            'text-align': 'center',
            'background-color': 'rgba(80, 0, 130, 255)',
            'border-color': 'rgba(255, 255, 0, 255)' });
        c.css({
            'flex-basis': '15%',
            'height': '3rem',
            'border': '0.1rem',
            'border-style': 'solid',
            'text-align': 'center',
            'background-color': 'rgba(80, 0, 130, 255)',
            'border-color': 'rgba(255, 255, 0, 255)' });
    }

    insertHint(word) {
        let temp = this.$inputChat.value;
        this.$inputChat.value = word;
        var ev = document.createEvent('Event');
        ev.initEvent('submit');
        formChat.dispatchEvent(ev);
        this.$inputChat.value = temp;
    }

    observeDOMNode(domNodeObj, callback) {
        let obs = new MutationObserver((mutations, observer) => {
            if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {
                callback(mutations[0].target);
            }
        });
        obs.observe(domNodeObj, { childList: true, subtree: true });
        return obs;
    }

    observeDOMObject(domNodeObj, callback) {
        let obs = new MutationObserver((mutations, observer) => {
            callback(mutations[0].target);
        });
        obs.observe(domNodeObj, { attributes: true, attributeFilter: ['style'] });
        return obs;
    }
}

if (typeof(Storage) !== 'undefined') {
    let helper = new Helper();
    sessionStorage.setItem('helper', helper);
    window.onbeforeunload = function (event) {
        helper.save();
        return;
    };
} else {
    console.log('Browser does not permit local storage.');
}