let ws;
let wsClosed = true;
deltaPoll();

function sendMessage(event) {
    initConnection();
    // if (!ws || wsClosed) {
    //     console.log('here')
    //     await initConnection();
    //     createWS();
    // }
    // console.log('here2')
    // const input = document.getElementById("messageText")
    // ws.send(JSON.stringify({val: input.value}))
    // input.value = ''
    event.preventDefault();
}


function createWS() {
    ws = new WebSocket("ws://127.0.0.1:8000/ws");
    wsClosed = false;
    ws.onmessage = function(event) {
        const messages = document.getElementById('messages');
        const message = document.createElement('li');
        const content = document.createTextNode(event.data);
        message.appendChild(content);
        messages.appendChild(message);
    }
    ws.onclose = function (event) {
        wsClosed = true;
    }
}


async function initConnection() {
    const r = await fetch("http://127.0.0.1:8000/init");
    console.log(await r.json());
    console.log(document.cookie);
    const r2 = await fetch("http://127.0.0.1:8000/test");
    console.log(await r2.json());

}


function deltaPoll(chId) {
    let pollInterval = 0;
    fetch(`http://127.0.0.1:8000/delta?ch_id=${chId}`)
        .then((r) => {
            if (r.status !== 200) {
                console.log('GOT WRONG STATUS:', r.status);
                pollInterval = 1000;
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
            console.log('REINIT');
            setTimeout(() => deltaPoll(chId), pollInterval)
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