let ws;
let wsClosed = true;

fetch("http://localhost:8000/init").then(
    r => {
        console.log(r, document.cookie);
        fetch('http://localhost:8000/test').then(
            r => console.log(r, document.cookie)
        )
    }
)



async function sendMessage(event) {
    if (!ws || wsClosed) {
        await initConnection();
        const testReq = await fetch('http://localhost:8000/test');
        console.log(await testReq.json())
        createWS();
    }

    const input = document.getElementById("messageText")
    ws.send(JSON.stringify({val: input.value}))
    input.value = ''
    event.preventDefault()
}


function createWS() {
    ws = new WebSocket("ws://localhost:8000/ws");
    wsClosed = false;
    ws.onmessage = function(event) {
        const messages = document.getElementById('messages')
        const message = document.createElement('li')
        const content = document.createTextNode(event.data)
        message.appendChild(content)
        messages.appendChild(message)
    }
    ws.onclose = function (event) {
        wsClosed = true;
    }
}


async function initConnection() {
    await fetch("http://localhost:8000/init");
}