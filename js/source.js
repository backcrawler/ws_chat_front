const anonUser = {
    wsClosed: true,
    ws: null,
    chId: null
}


async function sendMessage(event) {
    event.preventDefault();
    const response = await fetch('http://127.0.0.1:8000/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)  // todo: msg data
    })
    const json = await response.json();
    if (json.result !== 'ok') {
        console.log('ERR WHILE SENDING MSG:', json);
    }
}


function createWS() {
    anonUser.ws = new WebSocket("ws://127.0.0.1:8000/ws");
    anonUser.wsClosed = false;
    anonUser.ws.onmessage = function(event) {
        addNewMessage(event.data);
    }
    anonUser.ws.onclose = function (event) {
        anonUser.wsClosed = true;
    }
}


function addNewMessage(data) {
    const messages = document.getElementById('messages');
    const message = document.createElement('li');
    const content = document.createTextNode(data);
    message.appendChild(content);
    messages.appendChild(message);
}


async function initConnection() {
    const r = await fetch("http://127.0.0.1:8000/init", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({'name': 'Anon'})  // todo: name choice
    });
    console.log(await r.json());
    console.log('COOKIE:', document.cookie);
}


function deltaPoll(chId) {
    let pollInterval = 0;
    let reinit = true;
    fetch(`http://127.0.0.1:8000/delta?ch_id=${chId}`)
        .then((r) => {
            if (r.status !== 200) {
                pollInterval = 1000;
                console.log('GOT WRONG STATUS:', r.status);
                if (r.status === 401) {
                    reinit = false;
                }
            } else {
                r.json()
                    .then((json) => {
                        console.log('json:', json)
                        if (json.result && json.result !== 'reinit-required') {
                            processDeltas(json.result);
                        }
                    })
                pollInterval = 0;
            }
        })
        .catch((err) => {
            console.log('ERR:', err);
            pollInterval = 1000;
        })
        .finally(() => {
            if (reinit) {
                console.log('REINIT');
                setTimeout(() => deltaPoll(chId), pollInterval)
            }
        })
}


function processDeltas(deltas) {

}


async function fetchWithTimeout(resource, options = {}) {
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

initConnection();
