function doWithTimeout(asyncJob, maxTime, ...args) {
    return new Promise((resolve, reject) => {
        setTimeout(
            reject.bind(
                null,
                // setTimeout of JSBox does not support passing other args
                new Error(
                    `Async task ${
                        asyncJob.name ? `"${asyncJob.name}" ` : ''
                    }is timeout`
                )
            ),
            maxTime
        );
        asyncJob(...args).then(resolve, reject);
    });
}

module.exports = doWithTimeout;
