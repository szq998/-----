const { LOG_DIR } = require('./constant');

function logError(errorInfo, logName) {
    $file.write({
        data: $data({ string: JSON.stringify(errorInfo) }),
        path: `${LOG_DIR}/${logName}-${new Date()}.json`,
    });
}

module.exports = logError;
