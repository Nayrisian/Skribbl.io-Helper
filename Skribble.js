const helperPreInit = new Event('helperPreInit');
const helperPostInit = new Event('helperPostInit');

window.addEventListener('helperPostInit', function() {
    $('.container-fluid').css('margin-left', '0');
});

class Helper {
    constructor() {
        this.$commands;
        this.$dictionary;
        this.$helper;
        this.$hintList;
        this.$inputChat = $('#inputChat')[0];
        this.$formChat = $('#formChat')[0];
        this.$currentWord = $('#currentWord')[0];
        this.$solutionWord = $('#overlay > .content > .text')[0];
        this.$selectWord = $('#overlay > .content > .wordContainer')[0];
        this.$commands = JSON.parse(localStorage.getItem('$commands'))
                || { 'arabic': `﷽`.repeat(100), 'greek': `ௌ`.repeat(100) };
        this.$dictionary = JSON.parse(localStorage.getItem('$dictionary')) || {}; 
        this.initOverlay();
        this.$currentWordObserver = this.observeDOMNode(this.$currentWord, target => {
            let underscoreCount = target.innerHTML.split('_').length - 1;
            if (underscoreCount > 0) {
                this.$hintList.empty();
                let words = this.getWords(target.innerHTML);
                if (words !== undefined) {
                    words.forEach(word => {
                        this.addHintNode(word);
                    });
                }
            }
        });
        this.$solutionWordObserver = this.observeDOMNode(this.$solutionWord, target => {
            let textPhrase = target.innerHTML;
            if (textPhrase === 'Choose a word') {
                this.ownRound = true;
                for (let i = 0; i < this.$selectWord.children.length; i++) {
                    this.addWord(this.$selectWord.children[i].innerHTML);
                }
            } else if (textPhrase.startsWith('The word was: ')) {
                if (this.ownRound) {
                    this.ownRound = false;
                } else {
                    let word = textPhrase.split('The word was: ').pop();
                    this.addWord(word);
                }
            }
        });
        window.dispatchEvent(helperPostInit);
    }

    addWord(word) {
        if (this.$dictionary[word.length] === undefined)
            this.$dictionary[word.length] = [];
        if (this.$dictionary[word.length].indexOf(word) === -1) {
            this.$dictionary[word.length].push(word);
            this.save();
        }
    }

    getWords(word) {
        let regex = word.replace(/_/g, '\\w');
        let filterRegex = new RegExp(regex, 'g');
        let words = [];
        if (this.$dictionary[word.length] !== undefined) {
            this.$dictionary[word.length].forEach(function(entry) {
                if (entry.match(filterRegex))
                    words.push(entry);
            });
        }
        return words;
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
        this.$helper.append(this.$hintList);
        $('body').append(this.$helper);
    }

    addHintNode(word) {
        let $button = $('<div>', { class: 'hintWord' });
        $button.text(word);
        $button.css({ 
            'height' : '3rem',
            'margin' : '0.5rem',
            'background-color': 'rgba(80, 0, 130, 255)' });
        $button.click(() => { this.insertHint(word); });
        this.$hintList.append($button);
    }

    insertHint(word) {
        let temp = this.$inputChat.value;
        this.$inputChat.value = word;
        var ev = document.createEvent('Event');
        ev.initEvent('submit');
        formChat.dispatchEvent(ev);
        this.$inputChat.value = temp;
    }

    save() {
        localStorage.setItem('$commands', JSON.stringify(this.$commands));
        localStorage.setItem('$dictionary', JSON.stringify(this.$dictionary));
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