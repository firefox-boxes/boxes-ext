var port = browser.runtime.connectNative("boxes_ext_native_shell");
var self = undefined;
var connected = false;
var cb = 0;

function makeSelfActive() {
    browser.windows.getAll().then(windows => {
        browser.windows.update(windows[0].id, {
            focused: true
        });
    });
}

port.onMessage.addListener(res => {
    if (!connected) {
        self = res.msg;
        makeSelfActive();
    }
    if (connected && cb !== 0) {
        cb(res.msg);
    }
    connected = true;
});

async function getBoxes() {
    return new Promise((resolve, reject) => {
        cb = reply => {
            resolve(reply.split("\n").slice(0, -1).map(v => {
                let [id, icon, name, exec] = v.split("|");
                return {
                    id, icon, name, exec
                };
            }));
        };
        port.postMessage("box:ls");
    });
}

async function getInstallations() {
    return new Promise((resolve, reject) => {
        cb = reply => {
            resolve(reply.split("\n"));
        };
        port.postMessage("i:ls");
    });
}

async function startBox(id) {
    return new Promise((resolve, reject) => {
        cb = resolve;
        port.postMessage("exec " + id);
    });
}

async function newBox(icon, name, exec) {
    return new Promise((resolve, reject) => {
        cb = reply => {
            resolve(reply);
        };
        port.postMessage("box:new " + icon + "|" + name + "|" + exec);
    });
}

browser.runtime.onMessage.addListener(msg => {
    switch (msg.type) {
        case "i:ls":
            return getInstallations();
        case "box:ls":
            return getBoxes();
        case "box:new":
            return newBox(...msg.args);
        case "exec":
            return startBox(...msg.args);
        case "whoami":
            return Promise.resolve(self);
        default:
            return new Error("no such type exists");
    }
});