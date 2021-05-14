const renderBackground = require('./render-background');

function renderError(tiebaName, ctx) {
    return {
        type: 'zstack',
        props: {
            widgetURL: `jsbox://run?name=${encodeURIComponent(
                $addin.current.name
            )}`,
        },
        views: [
            renderBackground(ctx),
            {
                type: 'text',
                props: {
                    padding: 15,
                    minimumScaleFactor: 0.5,
                    text: tiebaName
                        ? `"${tiebaName}吧"加载失败\n请检查网络连接和贴吧名`
                        : `使用方法：\n    1. 点击进入主应用\n    2. 添加贴吧\n    3. 回到主屏幕\n    4. 长按编辑小组件\n    5. 在输入参数中选择要展示的贴吧`,
                },
            },
        ],
    };
}

module.exports = renderError;
