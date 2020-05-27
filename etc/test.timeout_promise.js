const assert = require("assert");

function create_timeout_promise(promise, timeout, errMsg) {
    assert(promise instanceof Promise,
        "The promise must be a Promise.");
    assert(typeof timeout === "number" && timeout > 0,
        "The timeout must be a number greater than 0.");

    let timeoutErr = new Error(typeof errMsg === "string" ? errMsg :
        `This promise timed out after waiting ${timeout}s for the original promise.`);
    Object.defineProperty(timeoutErr, "name", { value: "TimeoutError" });
    Error.captureStackTrace(timeoutErr, create_timeout_promise);

    return new Promise((resolve, reject) => {
        let pending = true;

        let timeoutID = setTimeout(() => {
            if (pending) {
                pending = false;
                clearTimeout(timeoutID);
                reject(timeoutErr);
            }
        }, 1e3 * timeout);

        promise.then((result) => {
            if (pending) {
                pending = false;
                clearTimeout(timeoutID);
                resolve(result);
            }
        }).catch((err) => {
            if (pending) {
                pending = false;
                clearTimeout(timeoutID);
                reject(err);
            }
        });
    });
} // create_timeout_promise

let promise = new Promise(resolve => setTimeout(resolve, 1e3, "Hello World!"));
let timed_promise = create_timeout_promise(promise, Math.round(1e4 * Math.PI / 4) / 1e4);
timed_promise.then(console.log).catch(console.error);