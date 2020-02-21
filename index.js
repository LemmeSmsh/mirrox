import download from 'downloadjs';

class Mirrox {
    constructor() {
        this.defaults = {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        };
        this.logging = false;
        this.recording = false;
        this.recordingBody = [];
        this.unloggedUrls = [];

        let openRequest = indexedDB.open("mirrox_logging", 1);

        openRequest.onerror = () => {
            console.error("Error", openRequest.error);
        };

        openRequest.onsuccess = () => {
            const db = openRequest.result;

            openRequest.onupgradeneeded = function () {
                db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
            }

            this.db = db;
            this.transaction = this.db.transaction('requests', 'readonly');
            this.requests = this.transaction.objectStore('requests');
        };
    };

    async get(url, params = {}, headers = {}, returnRawResponse = false, responseFormat = 'json') {

        const processedQuery = Object.keys(params).reduce((acc, cur) => {
            acc.push(`${cur}=${params[cur]}`);
            return acc;
        }, []);

        const response = await fetch(`${url}?${processedQuery.join('&')}`, {
            method: 'GET',
            headers: { ...this.defaults.headers, ...headers }
        })

        const message = await response.json();

        if (this.logging && !url.includes('validity')) {
            const now = new Date();
            const requestData = {
                url,
                method: 'GET',
                time: `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`,
                params,
                status: response.status,
                response: message,
            };

            const transaction = this.db.transaction('requests', 'readwrite');
            const requests = transaction.objectStore('requests');

            const addingRequest = requests.add(requestData);

            addingRequest.onerror = function () {
                console.log("Ошибка при добавлении", requestData, addingRequest.error);
            };

            this.recordingBody.push(requestData);
        };

        if (!response.ok) {
            response.response = message;
            response.method = 'GET';
            return Promise.reject(response);
        }

        if (returnRawResponse) {
            return response;
        } else {
            return message;
        }
    };

    async delete(url, headers = {}, returnRawResponse = false, responseFormat = 'json') {

        const response = await fetch(url, {
            method: 'DELETE',
            headers: { ...this.defaults.headers, ...headers }
        })
        if (!response.ok) {
            const message = await response.json();
            response.response = message;
            response.method = 'DELETE';
            return Promise.reject(response);
        }
        if (returnRawResponse) {
            return response;
        } else {
            return response[responseFormat]();
        }
    };

    async post(url, body = {}, headers = {}, returnRawResponse = false, responseFormat = 'json') {

        const response = await fetch(url, {
            method: 'POST',
            headers: { ...this.defaults.headers, ...headers },
            body: JSON.stringify(body)
        })

        const message = await response.json();

        if (this.logging && !url.includes('validity')) {
            const requestData = {
                url,
                method: 'POST',
                body,
                status: response.status,
                response: message,
                time: Date.now()
            };

            const transaction = this.db.transaction('requests', 'readwrite');
            const requests = transaction.objectStore('requests');

            const addingRequest = requests.add(requestData);

            addingRequest.onerror = function () {
                console.log("Ошибка при добавлении", requestData, addingRequest.error);
            };

            this.recordingBody.push(requestData);
        };

        if (!response.ok) {
            response.response = message;
            response.request = body;
            response.method = 'POST';
            return Promise.reject(response);
        }
        if (returnRawResponse) {
            return response;
        } else {
            return message;
        }
    };

    async put(url, body = {}, headers = {}, returnRawResponse = false, responseFormat = 'json') {

        const response = await fetch(url, {
            method: 'PUT',
            headers: { ...this.defaults.headers, ...headers },
            body: JSON.stringify(body)
        })

        const message = await response.json();

        if (!response.ok) {
            response.response = message;
            response.method = 'PUT';
            return Promise.reject(response);
        }
        if (returnRawResponse) {
            return response;
        } else {
            return response[responseFormat]();
        }
    };

    async patch(url, body = {}, headers = {}, returnRawResponse = false, responseFormat = 'json') {

        const response = await fetch(url, {
            method: 'PATCH',
            headers: { ...this.defaults.headers, ...headers },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const message = await response.json();
            response.response = message;
            response.method = 'PATCH';
            return Promise.reject(response);
        }

        if (returnRawResponse) {
            return response;
        } else {
            return response[responseFormat]();
        }
    };
};

const mirrox = new Mirrox();

export default mirrox;

export function setLogging(logging) {
    console.log(`mirrox.logging is ${logging} now`);
    mirrox.logging = logging;

    if (!mirrox.logging) {
        const now = new Date();
        download(new Blob([JSON.stringify(mirrox.recordingBody)]),
            `SSVM-logs ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`
        );
        mirrox.recordingBody = [];
    }
};