const anonUser = {
    ws: null,
    _name: null,
    clientSideId: null,
    currentChat: null,
    pollErrorCount: 0,
    pollErrorThreshold: 20,

    get name () {
        return this._name || 'Anon';
    },

    set name (value) {
        this._name = value;
        UIController.userNameField.innerText = this.name;
    }
}

const UIController = {
    inputField: null,
    chatFrame: null,
    infoMessageTemplate: null,
    basicMessageTemplate: null,
    userNameField: null,

    init: function () {
        this.inputField = document.getElementById('message-text');
        this.chatFrame = document.getElementById('chat-frame');
        this.userNameField = document.getElementById('self-name-placeholder');
        this.userNameField.innerText = anonUser.name;
        this.infoMessageTemplate = document.querySelector('[data-template="message-info"]').cloneNode(true);
        this.infoMessageTemplate.style.display = 'block';
        this.basicMessageTemplate = document.querySelector('[data-template="message-basic"]').cloneNode(true);
        this.basicMessageTemplate.style.display = 'block';
    },

    addNewMessage: function (data) {
        let message;
        if (data.kind === 'basic') {
            message = this.basicMessageTemplate.cloneNode(true)
        } else if (data.kind === 'info') {
            message = this.infoMessageTemplate.cloneNode(true)
        }
        message.querySelector('.message-time').innerText = this._getTimeFromTs(data.createdTs);
        message.querySelector('b').innerText = anonUser.name;
        message.querySelector('.message-text').innerText = data.text;
        this.chatFrame.appendChild(message);
    },

    _getTimeFromTs: function (ts) {
        const date = new Date(ts*1000);
        const hours = date.getHours();
        const minutes = "0" + date.getMinutes();
        const seconds = "0" + date.getSeconds();
        return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    }
}


const connectionController = {
    startChat: async function (event) {
        console.log('START', anonUser);
        if (anonUser.currentChat) {
            return;
        }
        event.preventDefault();
        const response = await fetch('/start_chat');
        const json = await response.json();
        console.log('GOT FROM CREATE:', json);
        if (json.result !== 'ok') {
            alert('Chat start failed');
            return
        }
        anonUser.currentChat = json.chat;
        deltaPoll(anonUser.currentChat.chatId);
    },

    sendMessage: async function (event) {
        event.preventDefault();
        const msgArea = UIController.inputField;
        if (!msgArea.value) {
            return;
        }
        const response = await fetch('/message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'text': msgArea.value,
                'ch_id': anonUser.currentChat.chatId
            })
        })
        const json = await response.json();
        if (json.result !== 'ok') {
            console.log('ERR WHILE SENDING MSG:', json);
        }
    },

    onKeyDownForMessage: async function(event) {
        if(event.keyCode === 13) {
            event.preventDefault();
            await this.sendMessage(event);
        }
    },

    createWS: function () {
        anonUser.ws = new WebSocket("/ws");
        anonUser.ws.onmessage = function(event) {
            this.addNewMessage(event.data);
        }
        anonUser.ws.onclose = function (event) {
            anonUser.ws = null;
        }
    },

    nameChange: async function (event) {
        const nameInput = document.getElementById('new-name-input');
        const r = await fetch(`/name_change?name=${nameInput.value}`);
        const json = await r.json();
        if (json.result !== 'ok') {
            alert('Unsuccessful name change!');
        }
    },

    initConnection: async function () {
        const r = await fetch("/init", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({'name': 'Anon'})  // todo: name choice
        });
        console.log(await r.json());
    },

    processDeltas: function (deltas) {
        console.log('GOT DELTAS:', deltas);
        for (const delta of deltas) {
            switch (delta.name) {
                case 'CHAT':
                    if (['add', 'upd'].includes(delta.type)) {
                        anonUser.currentChat = delta.data;
                    }
                    break;
                case 'CHAT_MESSAGE':
                    if (delta.type === 'add') {
                        UIController.addNewMessage(delta.data);
                    }
                    break;
                case 'PERSON_NAME':
                    if (delta.type === 'upd') {
                        anonUser.name = delta.data.name;
                    }
                    break;
            }
        }
    },

    fetchWithTimeout: async function (resource, options = {}) {
        const { timeout = 8000 } = options;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);

        return response;
    }
}


function deltaPoll(chId) {
    let pollInterval = 0;
    let reinit = true;
    fetch(`/delta?ch_id=${chId}`)
        .then((r) => {
            if (r.status !== 200) {
                pollInterval = 1000;
                anonUser.pollErrorCount++;
                console.log('GOT WRONG STATUS:', r.status);
                if (r.status === 401) {
                    reinit = false;
                }
            } else {
                r.json()
                    .then((json) => {
                        console.log('json:', json)
                        if (json.result && json.result !== 'reinit-required') {
                            connectionController.processDeltas(json.result);
                        }
                    })
                pollInterval = 0;
            }
        })
        .catch((err) => {
            console.log('ERR WHILE POLLING:', err);
            anonUser.pollErrorCount++;
            pollInterval = 1000;
        })
        .finally(() => {
            if (anonUser.pollErrorCount > anonUser.pollErrorThreshold) {
                reinit = false;
            }
            if (reinit) {
                console.log('REINIT');
                setTimeout(() => deltaPoll(chId), pollInterval)
            }
        })
}


(function prepareEnvironment() {
    window.addEventListener('beforeunload', (e) => {
        fetch('/exit');
    })

    setInterval(() => {  // reset
        anonUser.pollErrorCount = 0;
    }, 1000 * 60);

    UIController.init();

    connectionController.initConnection();
})();