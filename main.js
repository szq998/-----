const mainWidget = require('./scripts/main-widget');
const mainJSBox = require('./scripts/main-jsbox');

if ($app.env === $env.widget) {
    mainWidget();
} else {
    // 编辑可选的贴吧
    mainJSBox();
}
