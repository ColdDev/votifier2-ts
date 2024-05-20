const crypto = require("crypto");
const net = require("net");

const createMessage = (header, vote, options) => {
    const data = header.split(" ");

    if (data.length != 3) {
        throw new Error("Not a Votifier v2 protocol server");
    }

    vote["challenge"] = data[2].substring(0, data[2].length - 1);
    const voteAsJson = JSON.stringify(vote);
    const digest = crypto.createHmac("sha256", options.token);
    digest.update(voteAsJson);
    const sig = digest.digest("base64");

    const message = JSON.stringify({
        payload: JSON.stringify(vote),
        signature: sig,
    });
    const messageBuffer = Buffer.alloc(message.length + 4);
    messageBuffer.writeUInt16BE(0x733a);
    messageBuffer.writeUInt16BE(message.length, 2);
    messageBuffer.write(message, 4);
    return messageBuffer;
};

module.exports = exports = function vote(options) {
    return new Promise((resolve, reject) => {
        if (!options.host || !options.port || !options.token || !options.vote)
            return reject(
                new Error("missing host, port, token, or vote in 'server'"),
            );
        const vote = options.vote;
        if (
            !vote.username ||
            !vote.address ||
            !vote.timestamp ||
            !vote.serviceName
        )
            return reject(
                new Error(
                    "missing username, address, timestamp, or serviceName in 'vote'",
                ),
            );

        const socket = net.createConnection(options.port, options.host);
        const returnError = () => reject(new Error("Unexpected error"));
        socket.setTimeout(2000, () => {
            socket.removeListener("end", returnError);
            socket.end();
            reject(new Error("Socket timeout"));
        });
        socket.on("error", (err) => reject(new Error("Socket error: " + err)));
        socket.once("data", (buf) => {
            socket.once("end", returnError);
            let message;
            try {
                message = createMessage(buf.toString(), vote, options);
            } catch (e) {
                return reject(e);
            }
            socket.write(message);
            socket.once("data", (respBuf) => {
                const resp = JSON.parse(respBuf.toString());
                socket.removeListener("end", returnError);
                socket.end();
                if (resp.status == "error")
                    return reject(
                        new Error(resp.cause + ": " + resp.errorMessage),
                    );
                else resolve();
            });
        });
    });
};
